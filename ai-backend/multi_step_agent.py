"""
다단계 에이전트 시스템
모든 에이전트를 다단계 분석으로 전환하여 정보 충분성을 평가하고 필요시 추가 탐색 수행
"""

import json
import re
from typing import Dict, List, Any, Callable, Optional

MAX_ANALYSIS_STEPS = 10

def evaluate_information_sufficiency(
    current_result: Dict[str, Any],
    agent_type: str,
    call_llm_func: Callable,
    step_number: int
) -> Dict[str, Any]:
    """
    현재 분석 결과의 정보 충분성을 평가
    
    Returns:
        {
            "is_sufficient": bool,
            "confidence": "high|medium|low",
            "needs_more_info": bool,
            "next_search_strategy": str,
            "files_to_read": List[str],
            "reason": str
        }
    """
    evaluation_prompt = f"""당신은 정보 분석 전문가입니다. 현재 분석 결과를 평가하여 충분한 정보가 수집되었는지 판단하세요.

⚠️ 중요: 반드시 한국어로만 응답하세요.

## 현재 분석 단계: {step_number}/{MAX_ANALYSIS_STEPS}

## 에이전트 타입: {agent_type}

## 현재 분석 결과:
{json.dumps(current_result, ensure_ascii=False, indent=2)[:1000]}

## 평가 기준:
1. **정보 충분성**: 질문에 답변하기에 충분한 정보가 있는가?
2. **신뢰도**: 현재 결과의 신뢰도는 어느 정도인가?
3. **추가 탐색 필요성**: 더 많은 정보가 필요한가?
4. **다음 단계 전략**: 추가 탐색이 필요하다면 어떤 파일이나 데이터를 확인해야 하는가?

## 응답 형식
다음 JSON 형식으로만 응답하세요 (반드시 한국어로):
{{
  "is_sufficient": true 또는 false,
  "confidence": "high|medium|low",
  "needs_more_info": true 또는 false,
  "next_search_strategy": "추가 탐색 전략 설명 (한국어)",
  "files_to_read": ["파일경로1", "파일경로2"],
  "commits_to_analyze": ["커밋SHA1", "커밋SHA2"],
  "reason": "평가 이유를 한국어로 설명"
}}

규칙:
- 충분한 정보가 있고 신뢰도가 high이면 is_sufficient: true
- 정보가 부족하거나 신뢰도가 낮으면 needs_more_info: true
- files_to_read는 확인해야 할 파일 경로 배열 (최대 5개)
- commits_to_analyze는 더 자세히 분석해야 할 커밋 SHA 배열 (최대 5개)
- 단계가 {MAX_ANALYSIS_STEPS}에 도달하면 무조건 is_sufficient: true로 설정
"""
    
    system_prompt = "정보 분석 전문가. 분석 결과의 충분성을 냉정하게 평가합니다. 반드시 한국어로만 응답. JSON만 응답."
    
    try:
        content = call_llm_func(evaluation_prompt, system_prompt)
        
        # JSON 파싱
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        content = content.strip()
        if '{' in content:
            content = content[content.find('{'):]
        if '}' in content:
            content = content[:content.rfind('}')+1]
        
        evaluation = json.loads(content)
        
        # 최대 단계 도달 시 강제로 충분하다고 판단
        if step_number >= MAX_ANALYSIS_STEPS:
            evaluation['is_sufficient'] = True
            evaluation['needs_more_info'] = False
            evaluation['reason'] = f'최대 분석 단계({MAX_ANALYSIS_STEPS})에 도달했습니다.'
        
        return evaluation
    except Exception as e:
        print(f"[Multi-Step Agent] 정보 충분성 평가 실패: {e}")
        # 에러 발생 시 기본값 반환 (다음 단계 진행)
        return {
            "is_sufficient": step_number >= MAX_ANALYSIS_STEPS,
            "confidence": "low",
            "needs_more_info": step_number < MAX_ANALYSIS_STEPS,
            "next_search_strategy": "평가 실패로 인한 기본 탐색",
            "files_to_read": [],
            "commits_to_analyze": [],
            "reason": f"평가 중 오류 발생: {str(e)}"
        }

def get_file_contents(
    github_repo: str,
    github_token: Optional[str],
    file_paths: List[str],
    ref: str = 'main',
    max_lines_per_file: int = 500
) -> List[Dict[str, Any]]:
    """
    GitHub에서 파일 내용을 가져옴
    
    Returns:
        [
            {
                "filePath": "...",
                "content": "...",
                "truncated": bool,
                "error": "..." (있을 경우)
            },
            ...
        ]
    """
    if not github_repo or not file_paths:
        return []
    
    try:
        import requests
        
        headers = {}
        if github_token:
            headers['Authorization'] = f'token {github_token}'
        
        # repoUrl에서 owner/repo 추출
        match = re.search(r'github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?/?$', github_repo)
        if not match:
            return []
        
        owner = match.group(1)
        repo = match.group(2).replace('.git', '')
        
        results = []
        for file_path in file_paths[:10]:  # 최대 10개 파일만
            try:
                url = f'https://api.github.com/repos/{owner}/{repo}/contents/{file_path}'
                if ref != 'main':
                    url += f'?ref={ref}'
                
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()
                
                file_data = response.json()
                
                if file_data.get('type') != 'file':
                    results.append({
                        "filePath": file_path,
                        "content": None,
                        "error": "파일이 아닙니다."
                    })
                    continue
                
                import base64
                content = base64.b64decode(file_data['content']).decode('utf-8')
                
                # 라인 수 제한
                lines = content.split('\n')
                truncated = False
                if max_lines_per_file > 0 and len(lines) > max_lines_per_file:
                    content = '\n'.join(lines[:max_lines_per_file])
                    truncated = True
                
                results.append({
                    "filePath": file_path,
                    "content": content,
                    "truncated": truncated,
                    "totalLines": len(lines),
                    "error": None
                })
            except Exception as e:
                results.append({
                    "filePath": file_path,
                    "content": None,
                    "error": str(e)
                })
        
        return results
    except Exception as e:
        print(f"[Multi-Step Agent] 파일 읽기 실패: {e}")
        return []

def execute_multi_step_agent(
    agent_type: str,
    context: Dict[str, Any],
    call_llm_func: Callable,
    user_message: Optional[str] = None,
    initial_prompt_func: Callable = None,
    followup_prompt_func: Callable = None,
    system_prompt: str = "전문가. 반드시 한국어로만 응답. JSON만 응답."
) -> Dict[str, Any]:
    """
    다단계 분석을 수행하는 공통 함수
    
    Args:
        agent_type: 에이전트 타입
        context: 컨텍스트 정보
        call_llm_func: LLM 호출 함수
        user_message: 사용자 메시지 (선택사항)
        initial_prompt_func: 초기 프롬프트 생성 함수
        followup_prompt_func: 후속 프롬프트 생성 함수
        system_prompt: 시스템 프롬프트
    
    Returns:
        {
            "agent_type": "...",
            "response": {...},
            "analysis_steps": int,
            "all_steps": [...]
        }
    """
    all_steps = []
    current_result = None
    step_number = 0
    accumulated_files = []  # 읽은 파일 추적
    accumulated_commits = []  # 분석한 커밋 추적
    progress_messages = []  # 진행 상황 메시지 추적
    
    github_repo = context.get('githubRepo', '')
    github_token = context.get('githubToken')
    
    # 에이전트 타입별 한국어 이름
    agent_name_kr = {
        "task_suggestion_agent": "Task 제안",
        "progress_analysis_agent": "진행도 분석",
        "task_completion_agent": "Task 완료 확인",
        "general_qa_agent": "질문 답변",
        "task_assignment_agent": "Task 할당 추천"
    }.get(agent_type, "분석")
    
    while step_number < MAX_ANALYSIS_STEPS:
        step_number += 1
        print(f"[Multi-Step Agent] {agent_type} - 단계 {step_number}/{MAX_ANALYSIS_STEPS} 시작")
        
        # 진행 상황 메시지 추가
        if step_number == 1:
            progress_messages.append(f"🔍 {agent_name_kr}을(를) 위해 정보를 수집하고 있습니다...")
        else:
            progress_messages.append(f"📊 추가 정보를 분석 중입니다... (단계 {step_number}/{MAX_ANALYSIS_STEPS})")
        
        # 프롬프트 생성
        if step_number == 1:
            # 초기 프롬프트
            if initial_prompt_func:
                prompt = initial_prompt_func(context, user_message, accumulated_files, accumulated_commits)
            else:
                # 기본 프롬프트 생성 (에이전트별로 다름)
                prompt = f"분석을 시작합니다. 컨텍스트: {json.dumps(context, ensure_ascii=False)[:500]}"
        else:
            # 후속 프롬프트
            if followup_prompt_func:
                prompt = followup_prompt_func(context, current_result, user_message, accumulated_files, accumulated_commits)
            else:
                # 기본 후속 프롬프트
                prompt = f"""이전 분석 결과를 바탕으로 더 깊이 분석하세요.

이전 분석 결과:
{json.dumps(current_result, ensure_ascii=False, indent=2)[:1000]}

읽은 파일:
{json.dumps(accumulated_files, ensure_ascii=False)[:500]}

추가로 확인해야 할 정보가 있다면 더 자세히 분석하세요."""
        
        # LLM 호출
        try:
            content = call_llm_func(prompt, system_prompt)
            
            # JSON 파싱
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            content = content.strip()
            if '{' in content:
                content = content[content.find('{'):]
            if '}' in content:
                content = content[:content.rfind('}')+1]
            
            step_result = json.loads(content)
            step_result['step_number'] = step_number
            all_steps.append(step_result)
            current_result = step_result
            
            print(f"[Multi-Step Agent] {agent_type} - 단계 {step_number} 완료")
            
        except Exception as e:
            print(f"[Multi-Step Agent] {agent_type} - 단계 {step_number} 실패: {e}")
            # 에러 발생 시 이전 결과 사용 또는 기본값 반환
            if current_result:
                break
            else:
                return {
                    "agent_type": agent_type,
                    "error": f"분석 실패: {str(e)}",
                    "response": {
                        "type": "error",
                        "message": f"분석 중 오류가 발생했습니다: {str(e)}"
                    },
                    "analysis_steps": step_number
                }
        
        # 정보 충분성 평가
        evaluation = evaluate_information_sufficiency(current_result, agent_type, call_llm_func, step_number)
        
        print(f"[Multi-Step Agent] {agent_type} - 평가 결과: 충분={evaluation.get('is_sufficient')}, 신뢰도={evaluation.get('confidence')}")
        
        # 충분한 정보가 있으면 종료
        if evaluation.get('is_sufficient', False):
            print(f"[Multi-Step Agent] {agent_type} - 정보 충분, 분석 종료 (단계 {step_number})")
            progress_messages.append(f"✨ 분석 완료! 최종 결과를 정리 중...")
            break
        
        # 추가 정보가 필요한 경우 파일 읽기
        if evaluation.get('needs_more_info', False) and step_number < MAX_ANALYSIS_STEPS:
            files_to_read = evaluation.get('files_to_read', [])
            commits_to_analyze = evaluation.get('commits_to_analyze', [])
            
            # 파일 읽기
            if files_to_read and github_repo:
                print(f"[Multi-Step Agent] {agent_type} - 파일 읽기 시작: {files_to_read}")
                progress_messages.append(f"📄 관련 파일을 읽는 중... ({len(files_to_read)}개 파일)")
                file_contents = get_file_contents(github_repo, github_token, files_to_read)
                
                # 읽은 파일을 accumulated_files에 추가
                for file_info in file_contents:
                    if file_info.get('content'):
                        accumulated_files.append({
                            "path": file_info['filePath'],
                            "content": file_info['content'],
                            "truncated": file_info.get('truncated', False)
                        })
                
                # 컨텍스트에 파일 내용 추가
                context['readFiles'] = accumulated_files
                progress_messages.append(f"✅ 파일 읽기 완료 ({len([f for f in file_contents if f.get('content')])}개 파일)")
            
            # 커밋 상세 분석 (필요시)
            if commits_to_analyze:
                progress_messages.append(f"🔎 커밋을 상세히 분석 중... ({len(commits_to_analyze)}개 커밋)")
                # 커밋 상세 정보를 컨텍스트에 추가
                context['detailedCommits'] = commits_to_analyze
                accumulated_commits.extend(commits_to_analyze)
        
        # 다음 단계로 진행
        if step_number >= MAX_ANALYSIS_STEPS:
            print(f"[Multi-Step Agent] {agent_type} - 최대 단계 도달, 분석 종료")
            progress_messages.append(f"✨ 최대 분석 단계에 도달했습니다. 최종 결과를 정리 중...")
            break
    
    # 최종 결과 구성
    final_response = {
        "agent_type": agent_type,
        "response": current_result if current_result else {},
        "analysis_steps": step_number,
        "all_steps": all_steps,
        "confidence": evaluation.get('confidence', 'medium') if 'evaluation' in locals() else 'low',
        "progress_messages": progress_messages  # 진행 상황 메시지 추가
    }
    
    return final_response

