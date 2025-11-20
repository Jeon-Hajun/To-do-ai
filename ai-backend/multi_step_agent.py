"""
다단계 에이전트 시스템
모든 에이전트를 다단계 분석으로 전환하여 정보 충분성을 평가하고 필요시 추가 탐색 수행
"""

import json
import re
from typing import Dict, List, Any, Callable, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

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

## 진행도 분석 에이전트 특별 규칙:
- 진행도 분석의 경우, 소스코드 구조를 파악하기 위해 주요 디렉토리의 파일들을 읽어야 합니다.
- src/, app/, components/, routes/, controllers/ 등의 주요 디렉토리에서 파일들을 찾아 읽으세요.
- 각 파일의 내용을 확인하여 어떤 기능이 구현되어 있는지 파악하세요.
- README만으로는 부족하며, 실제 소스코드를 확인해야 정확한 분석이 가능합니다.
- **페이지와 컴포넌트 분석**: 프로젝트 특성에 따라 페이지나 컴포넌트가 없을 수도 있습니다. 하지만 웹 애플리케이션이라면 pages/, components/, views/ 등의 디렉토리를 확인하세요.
- **유동적 소제목 분류**: 프로젝트 구조에 따라 소제목을 유동적으로 나누세요 (예: 웹 앱이면 페이지/컴포넌트, API 서버면 엔드포인트/서비스, 라이브러리면 모듈/함수 등).
- **동적 파일 검색**: 각 소제목에 따라 필요한 파일을 찾아 읽으세요. 예를 들어, 페이지가 없다고 판단되면 다른 UI 관련 파일들을 찾아보세요.

## Task 완료 확인 에이전트 특별 규칙:
- Task 완료 확인은 **세부적인 코드 분석**이 핵심입니다. 커밋 메시지만으로 판단하지 말고 실제 코드 변경사항을 확인해야 합니다.
- Task 제목과 설명에서 요구하는 기능이 **구체적으로 구현되었는지** 확인하세요.
- **예상 구현 위치**: Task의 성격에 따라 예상되는 파일 위치를 추론하고, 해당 파일의 코드 변경사항을 상세히 분석하세요.
  - 예: "로그인 기능" → auth 관련 파일, 로그인 API 엔드포인트, 로그인 페이지 컴포넌트 등
  - 예: "GitHub 연동" → github 서비스 파일, GitHub API 클라이언트, GitHub 관련 컴포넌트 등
- **코드 변경사항 상세 분석**: 
  - 추가된 코드가 Task 요구사항을 구현하는가?
  - 수정된 코드가 Task 설명을 반영하는가?
  - 코드 변경사항이 Task의 목적을 달성하는가?
- **완료도 판단**: 
  - 완전히 구현되었는가? → 완료 (100%)
  - 부분적으로 구현되었는가? → 진행 중 (50-90%)
  - 구현되지 않았는가? → 미구현 (0-40%)
- **증거 수집**: Task 완료 여부를 뒷받침할 수 있는 구체적인 증거(파일명, 함수명, 코드 라인 등)를 수집하세요.
- **부족한 요구사항 확인**: Task 설명의 모든 요구사항이 구현되었는지 확인하고, 부족한 부분이 있다면 명시하세요.
- **신뢰도**: 코드 변경사항을 직접 확인했는지에 따라 신뢰도를 결정하세요. 커밋 메시지만으로 판단하면 신뢰도가 낮습니다.

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
- files_to_read는 확인해야 할 파일 경로 배열 (최대 10개, 진행도 분석의 경우 더 많이 권장)
- commits_to_analyze는 더 자세히 분석해야 할 커밋 SHA 배열 (최대 5개)
- 진행도 분석의 경우, 소스코드 파일들을 충분히 읽지 않았다면 needs_more_info: true
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

def verify_evidence_relevance(
    task_title: str,
    task_description: str,
    evidence: List[str],
    call_llm_func: Callable
) -> Dict[str, Any]:
    """
    Task 완료 근거(evidence)가 Task 제목과 설명과 관련성이 있는지 검증
    
    Args:
        task_title: Task 제목
        task_description: Task 설명
        evidence: 검증할 근거 리스트
        call_llm_func: LLM 호출 함수
    
    Returns:
        {
            "is_relevant": bool,
            "relevance_score": float (0-100),
            "relevant_evidence": List[str],
            "irrelevant_evidence": List[str],
            "needs_reanalysis": bool,
            "reason": str
        }
    """
    if not evidence:
        return {
            "is_relevant": False,
            "relevance_score": 0,
            "relevant_evidence": [],
            "irrelevant_evidence": [],
            "needs_reanalysis": True,
            "reason": "근거가 없습니다."
        }
    
    evidence_text = "\n".join([f"{i+1}. {ev}" for i, ev in enumerate(evidence)])
    
    verification_prompt = f"""당신은 Task 완료 근거 검증 전문가입니다. 생성된 근거(evidence)가 Task 제목과 설명과 직접적으로 관련이 있는지 검증하세요.

⚠️ 중요: 반드시 한국어로만 응답하세요.

## 분석 대상 Task
제목: {task_title}
설명: {task_description}

## 검증할 근거 목록
{evidence_text}

## 검증 기준
1. **직접 관련성**: 각 근거가 Task 제목 "{task_title}"와 직접적으로 관련이 있는가?
   - 예: Task 제목이 "유저 로그인 기능"인 경우, "로그인 API 구현", "로그인 페이지 추가" 등은 관련 있음
   - 예: Task 제목이 "유저 로그인 기능"인 경우, "Task 할당 기능", "멤버 검증 로직" 등은 관련 없음

2. **설명 일치성**: 각 근거가 Task 설명 "{task_description}"의 요구사항을 반영하는가?

3. **기능 일치성**: 근거가 언급하는 기능이 Task 제목에서 요구하는 기능과 일치하는가?

## 검증 규칙
- Task 제목과 직접 관련 없는 근거는 irrelevant_evidence에 포함
- 다른 Task나 다른 기능과 관련된 근거는 무조건 irrelevant_evidence
- Task 제목의 핵심 키워드(예: "로그인", "인증", "회원가입" 등)가 근거에 포함되어야 함
- 관련성 점수(relevance_score)는 관련 있는 근거의 비율로 계산 (0-100)

## 응답 형식
다음 JSON 형식으로만 응답하세요 (반드시 한국어로):
{{
  "is_relevant": true 또는 false,
  "relevance_score": 0-100,
  "relevant_evidence": ["관련 있는 근거1", "관련 있는 근거2"],
  "irrelevant_evidence": ["관련 없는 근거1", "관련 없는 근거2"],
  "needs_reanalysis": true 또는 false,
  "reason": "검증 결과를 한국어로 설명 (왜 관련이 있거나 없는지, 재분석이 필요한지)"
}}

규칙:
- relevance_score가 70 이상이면 is_relevant: true
- irrelevant_evidence가 1개 이상이면 needs_reanalysis: true
- 모든 근거가 관련 없으면 is_relevant: false, needs_reanalysis: true
"""
    
    system_prompt = "Task 완료 근거 검증 전문가. 근거와 Task 제목의 관련성을 엄격하게 평가합니다. 반드시 한국어로만 응답. JSON만 응답."
    
    try:
        content = call_llm_func(verification_prompt, system_prompt)
        
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
        
        verification_result = json.loads(content)
        
        # 기본값 설정
        if 'is_relevant' not in verification_result:
            verification_result['is_relevant'] = verification_result.get('relevance_score', 0) >= 70
        if 'needs_reanalysis' not in verification_result:
            verification_result['needs_reanalysis'] = len(verification_result.get('irrelevant_evidence', [])) > 0
        
        return verification_result
    except Exception as e:
        print(f"[Multi-Step Agent] 근거 검증 실패: {e}")
        # 에러 발생 시 기본값 반환 (재분석 필요로 판단)
        return {
            "is_relevant": False,
            "relevance_score": 0,
            "relevant_evidence": [],
            "irrelevant_evidence": evidence,
            "needs_reanalysis": True,
            "reason": f"검증 중 오류 발생: {str(e)}"
        }

def list_directory_contents(
    github_repo: str,
    github_token: Optional[str],
    directory_path: str,
    ref: str = 'main',
    max_depth: int = 1  # 기본 깊이를 1로 제한 (속도 향상)
) -> List[str]:
    """
    GitHub 디렉토리 내용을 나열하여 파일 목록을 가져옴
    
    Args:
        max_depth: 최대 탐색 깊이 (기본값: 1, 최대 2)
    
    Returns:
        파일 경로 리스트
    """
    if not github_repo or not directory_path:
        return []
    
    try:
        import requests
        import time
        
        start_time = time.time()
        
        headers = {}
        if github_token:
            headers['Authorization'] = f'token {github_token}'
        else:
            print(f"[Multi-Step Agent] ⚠️ GitHub 토큰 없음 - rate limit 제한 가능성")
        
        # repoUrl에서 owner/repo 추출
        match = re.search(r'github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?/?$', github_repo)
        if not match:
            return []
        
        owner = match.group(1)
        repo = match.group(2).replace('.git', '')
        
        url = f'https://api.github.com/repos/{owner}/{repo}/contents/{directory_path}'
        if ref != 'main':
            url += f'?ref={ref}'
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Rate limit 확인
        remaining = response.headers.get('X-RateLimit-Remaining', 'unknown')
        if remaining != 'unknown':
            remaining_int = int(remaining)
            if remaining_int < 10:
                print(f"[Multi-Step Agent] ⚠️ GitHub API rate limit 경고: {remaining_int}개 남음")
        
        contents = response.json()
        if not isinstance(contents, list):
            return []
        
        elapsed = time.time() - start_time
        if elapsed > 2:
            print(f"[Multi-Step Agent] 디렉토리 탐색 느림: {directory_path} ({elapsed:.2f}초)")
        
        files = []
        for item in contents:
            if item.get('type') == 'file':
                # JavaScript/TypeScript/JSX/Python 파일만
                file_name = item.get('name', '')
                if file_name.endswith(('.js', '.jsx', '.ts', '.tsx', '.py')):
                    files.append(item.get('path', ''))
            elif item.get('type') == 'dir' and max_depth > 0:
                # 하위 디렉토리는 재귀적으로 탐색 (깊이 제한)
                sub_path = item.get('path', '')
                # 최대 깊이 1로 제한 (속도 향상)
                sub_files = list_directory_contents(github_repo, github_token, sub_path, ref, max_depth - 1)
                files.extend(sub_files)
                # 파일이 너무 많아지면 중단
                if len(files) >= 100:
                    break
        
        return files
    except Exception as e:
        print(f"[Multi-Step Agent] 디렉토리 목록 조회 실패 ({directory_path}): {e}")
        return []

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
        import time
        
        headers = {}
        if github_token:
            headers['Authorization'] = f'token {github_token}'
            print(f"[Multi-Step Agent] 파일 읽기 시작: {len(file_paths)}개 파일, 토큰 사용 중 (길이: {len(github_token)})")
        else:
            print(f"[Multi-Step Agent] ⚠️ 파일 읽기: {len(file_paths)}개 파일, 토큰 없음 - rate limit 제한 가능성 (시간당 60회)")
        
        # repoUrl에서 owner/repo 추출
        match = re.search(r'github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?/?$', github_repo)
        if not match:
            print(f"[Multi-Step Agent] ⚠️ GitHub URL 파싱 실패: {github_repo}")
            return []
        
        owner = match.group(1)
        repo = match.group(2).replace('.git', '')
        print(f"[Multi-Step Agent] GitHub 저장소: {owner}/{repo}")
        
        # 첫 번째 요청으로 토큰 검증 및 rate limit 확인
        if github_token:
            try:
                test_url = f'https://api.github.com/repos/{owner}/{repo}'
                test_response = requests.get(test_url, headers=headers, timeout=5)
                rate_limit_remaining = test_response.headers.get('X-RateLimit-Remaining', 'unknown')
                rate_limit_total = test_response.headers.get('X-RateLimit-Limit', 'unknown')
                print(f"[Multi-Step Agent] GitHub API 연결 확인: rate limit {rate_limit_remaining}/{rate_limit_total} 남음")
                if rate_limit_remaining != 'unknown' and int(rate_limit_remaining) < 10:
                    print(f"[Multi-Step Agent] ⚠️ GitHub API rate limit 경고: {rate_limit_remaining}개만 남음!")
            except Exception as e:
                print(f"[Multi-Step Agent] ⚠️ GitHub API 연결 테스트 실패: {e}")
        
        file_read_start = time.time()
        
        # 병렬 처리로 파일 읽기
        def fetch_single_file(file_path):
            """단일 파일 읽기 함수"""
            try:
                import time
                start_time = time.time()
                
                url = f'https://api.github.com/repos/{owner}/{repo}/contents/{file_path}'
                if ref != 'main':
                    url += f'?ref={ref}'
                
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()
                
                # Rate limit 확인
                remaining = response.headers.get('X-RateLimit-Remaining', 'unknown')
                if remaining != 'unknown':
                    remaining_int = int(remaining)
                    if remaining_int < 10:
                        print(f"[Multi-Step Agent] ⚠️ GitHub API rate limit 경고: {remaining_int}개 남음")
                
                elapsed = time.time() - start_time
                if elapsed > 1:
                    print(f"[Multi-Step Agent] 파일 읽기 느림: {file_path} ({elapsed:.2f}초)")
                
                file_data = response.json()
                
                if file_data.get('type') != 'file':
                    return {
                        "filePath": file_path,
                        "content": None,
                        "error": "파일이 아닙니다."
                    }
                
                import base64
                content = base64.b64decode(file_data['content']).decode('utf-8')
                
                # 라인 수 제한
                lines = content.split('\n')
                truncated = False
                if max_lines_per_file > 0 and len(lines) > max_lines_per_file:
                    content = '\n'.join(lines[:max_lines_per_file])
                    truncated = True
                
                return {
                    "filePath": file_path,
                    "content": content,
                    "truncated": truncated,
                    "totalLines": len(lines),
                    "error": None
                }
            except Exception as e:
                return {
                    "filePath": file_path,
                    "content": None,
                    "error": str(e)
                }
        
        # 병렬 처리 (최대 10개 동시 요청)
        results = []
        files_to_fetch = file_paths[:50]  # 최대 50개 파일
        
        if len(files_to_fetch) > 1:
            # 병렬 처리
            print(f"[Multi-Step Agent] 병렬 파일 읽기 시작: {len(files_to_fetch)}개 파일")
            with ThreadPoolExecutor(max_workers=10) as executor:
                future_to_file = {executor.submit(fetch_single_file, file_path): file_path 
                                 for file_path in files_to_fetch}
                for future in as_completed(future_to_file):
                    result = future.result()
                    results.append(result)
        else:
            # 파일이 1개 이하면 순차 처리
            for file_path in files_to_fetch:
                results.append(fetch_single_file(file_path))
        
        file_read_elapsed = time.time() - file_read_start
        successful_reads = len([r for r in results if r.get('content')])
        print(f"[Multi-Step Agent] 파일 읽기 완료: {successful_reads}/{len(files_to_fetch)}개 성공, 소요 시간: {file_read_elapsed:.2f}초")
        
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
        
        # 진행 상황 메시지 추가 (에이전트 타입별로 구체적인 메시지)
        if agent_type == "progress_analysis_agent":
            if step_number == 1:
                progress_messages.append("🔍 1단계: 프로젝트 분석 중...")
            elif step_number == 2:
                progress_messages.append("📋 2단계: 필요한 기능 분석 중...")
            elif step_number == 3:
                progress_messages.append("🔎 3단계: 구현된 기능 확인 중...")
            elif step_number == 4:
                progress_messages.append("⚠️ 4단계: 미구현 기능 분석 중...")
            elif step_number == 5:
                progress_messages.append("📊 5단계: 평가 및 진행도 계산 중...")
            else:
                progress_messages.append(f"📊 추가 분석 중... (단계 {step_number}/{MAX_ANALYSIS_STEPS})")
        elif agent_type == "task_completion_agent":
            if step_number == 1:
                progress_messages.append("🔍 Task 요구사항 분석 및 예상 구현 위치 파악 중...")
            elif step_number == 2:
                progress_messages.append("📝 관련 커밋의 코드 변경사항 상세 분석 중...")
            elif step_number == 3:
                progress_messages.append("✅ Task 완료 여부 및 완성도 판단 중...")
            else:
                progress_messages.append(f"🔎 추가 세부 분석 중... (단계 {step_number}/{MAX_ANALYSIS_STEPS})")
        else:
            if step_number == 1:
                progress_messages.append(f"🔍 {agent_name_kr}을(를) 위해 정보를 수집하고 있습니다...")
            else:
                progress_messages.append(f"📊 추가 정보를 분석 중입니다... (단계 {step_number}/{MAX_ANALYSIS_STEPS})")
        
            # 진행도 분석 에이전트의 경우 첫 단계에서 README 파일 자동 읽기
        if step_number == 1 and agent_type == "progress_analysis_agent" and github_repo:
            # README 파일 찾기 시도
            readme_files = ["README.md", "README.txt", "readme.md", "README", "readme"]
            progress_messages.append("📖 README 파일을 찾는 중...")
            
            for readme_file in readme_files:
                try:
                    file_contents = get_file_contents(github_repo, github_token, [readme_file])
                    if file_contents and file_contents[0].get('content'):
                        accumulated_files.append({
                            "path": readme_file,
                            "content": file_contents[0]['content'],
                            "truncated": file_contents[0].get('truncated', False)
                        })
                        progress_messages.append(f"✅ {readme_file} 파일을 읽었습니다.")
                        context['readFiles'] = accumulated_files
                        break
                except:
                    continue
            
            # 프로젝트 구조 파악을 위한 주요 파일들도 읽기 시도
            if not accumulated_files:
                # package.json, requirements.txt 등 설정 파일 찾기
                config_files = ["package.json", "requirements.txt", "pom.xml", "build.gradle", "Cargo.toml"]
                progress_messages.append("📄 프로젝트 설정 파일을 찾는 중...")
                
                for config_file in config_files:
                    try:
                        file_contents = get_file_contents(github_repo, github_token, [config_file])
                        if file_contents and file_contents[0].get('content'):
                            accumulated_files.append({
                                "path": config_file,
                                "content": file_contents[0]['content'],
                                "truncated": file_contents[0].get('truncated', False)
                            })
                            progress_messages.append(f"✅ {config_file} 파일을 읽었습니다.")
                            context['readFiles'] = accumulated_files
                            break
                    except:
                        continue
        
        # Task 완료 확인 에이전트: 1단계 결과에서 expectedLocation 추출하여 파일 읽기
        if step_number == 1 and agent_type == "task_completion_agent" and github_repo:
            # 1단계 결과에서 expectedLocation 추출
            if current_result and current_result.get('expectedLocation'):
                expected_location = current_result.get('expectedLocation', '')
                print(f"[Multi-Step Agent] Task 완료 확인 - 예상 위치: {expected_location}")
                progress_messages.append(f"📄 예상 위치의 파일을 읽는 중: {expected_location}")
                
                # expectedLocation에서 파일 경로 추출 및 관련 파일 찾기
                files_to_read = []
                
                # expectedLocation이 파일 경로인 경우
                if expected_location and (expected_location.endswith(('.js', '.jsx', '.ts', '.tsx', '.py'))):
                    files_to_read.append(expected_location)
                
                # Task 제목에서 키워드 추출하여 관련 파일 찾기
                task = context.get('task', {})
                task_title = task.get('title', '').lower()
                task_description = task.get('description', '').lower()
                
                # 키워드 기반 파일 경로 추론
                if '로그인' in task_title or 'login' in task_title or '인증' in task_title or 'auth' in task_title:
                    files_to_read.extend([
                        "backend/routes/user.js",
                        "backend/controllers/userController.js",
                        "backend/middleware/auth.js",
                        "morpheus-react/web/src/pages/Login.jsx",
                        "morpheus-react/web/src/api/user.js"
                    ])
                elif 'github' in task_title or 'git' in task_title:
                    files_to_read.extend([
                        "backend/routes/github.js",
                        "backend/controllers/githubController.js",
                        "backend/services/githubService.js",
                        "morpheus-react/web/src/api/github.js"
                    ])
                elif 'task' in task_title or '작업' in task_title:
                    files_to_read.extend([
                        "backend/routes/task.js",
                        "backend/controllers/taskController.js",
                        "morpheus-react/web/src/api/task.js",
                        "morpheus-react/web/src/components/tasks/TaskManagement.jsx"
                    ])
                elif 'ai' in task_title or '에이전트' in task_title:
                    files_to_read.extend([
                        "backend/routes/ai.js",
                        "backend/controllers/aiController.js",
                        "ai-backend/agent_router.py",
                        "morpheus-react/web/src/api/ai.js"
                    ])
                
                # 중복 제거 및 최대 10개로 제한 (간결하게)
                files_to_read = list(set(files_to_read))[:10]
                
                # 파일 읽기
                for file_path in files_to_read:
                    if file_path not in [f.get('path', '') for f in accumulated_files]:
                        try:
                            file_contents = get_file_contents(github_repo, github_token, [file_path], max_lines_per_file=300)
                            if file_contents and file_contents[0].get('content'):
                                accumulated_files.append({
                                    "path": file_path,
                                    "content": file_contents[0]['content'],
                                    "truncated": file_contents[0].get('truncated', False)
                                })
                                progress_messages.append(f"✅ {file_path} 파일을 읽었습니다.")
                                context['readFiles'] = accumulated_files
                        except Exception as e:
                            print(f"[Multi-Step Agent] Task 완료 확인 - 파일 읽기 실패 ({file_path}): {e}")
                            continue
                
                if accumulated_files:
                    print(f"[Multi-Step Agent] Task 완료 확인 - {len(accumulated_files)}개 파일 읽기 완료")
        
        # 2단계 완료 후 필요한 파일 목록 생성 (논리적 파일 탐색)
        if step_number == 2 and agent_type == "progress_analysis_agent" and github_repo:
            # 2단계 결과에서 expectedLocation 추출하여 파일 경로 추론
            step2_result = all_steps[1] if len(all_steps) > 1 else {}
            required_features = step2_result.get('requiredFeatures', [])
            
            if required_features:
                progress_messages.append("🔍 2단계 결과를 바탕으로 필요한 파일을 찾는 중...")
                
                # expectedLocation에서 파일 경로 추출
                files_to_read_from_step2 = []
                
                for feat in required_features:
                    expected_loc = feat.get('expectedLocation', '')
                    feat_type = feat.get('type', '')
                    feat_name = feat.get('name', '')
                    
                    # API의 경우 라우트 파일 경로 추론
                    if feat_type == 'api':
                        # API 이름에서 리소스 추출 (예: "사용자 인증 API" → "user")
                        api_name_lower = feat_name.lower()
                        resource_map = {
                            '사용자': 'user',
                            'user': 'user',
                            '프로젝트': 'project',
                            'project': 'project',
                            'task': 'task',
                            '태스크': 'task',
                            'github': 'github',
                            'git': 'github',
                            'ai': 'ai',
                            '진행도': 'progress',
                            'progress': 'progress'
                        }
                        
                        resource = None
                        for key, value in resource_map.items():
                            if key in api_name_lower:
                                resource = value
                                break
                        
                        if resource:
                            # 백엔드 라우트 파일 경로 추론
                            backend_route = f"backend/routes/{resource}.js"
                            if backend_route not in files_to_read_from_step2:
                                files_to_read_from_step2.append(backend_route)
                            
                            # 컨트롤러 파일 경로 추론
                            controller = f"backend/controllers/{resource}Controller.js"
                            if controller not in files_to_read_from_step2:
                                files_to_read_from_step2.append(controller)
                            
                            # 프론트엔드 API 파일 경로 추론
                            frontend_api = f"morpheus-react/web/src/api/{resource}.js"
                            if frontend_api not in files_to_read_from_step2:
                                files_to_read_from_step2.append(frontend_api)
                    
                    # 페이지의 경우 경로에서 파일 추출
                    elif feat_type == 'page':
                        if expected_loc and '/' in expected_loc:
                            # 경로에서 파일명 추출 (예: "/src/pages/Login.jsx" → "src/pages/Login.jsx")
                            path = expected_loc.lstrip('/')
                            if path.endswith(('.jsx', '.js', '.tsx', '.ts')):
                                if path not in files_to_read_from_step2:
                                    files_to_read_from_step2.append(path)
                    
                    # 컴포넌트의 경우 경로에서 파일 추출
                    elif feat_type == 'component':
                        if expected_loc and '/' in expected_loc:
                            path = expected_loc.lstrip('/')
                            if path.endswith(('.jsx', '.js', '.tsx', '.ts')):
                                if path not in files_to_read_from_step2:
                                    files_to_read_from_step2.append(path)
                
                # 추론한 파일들을 읽기
                for file_path in files_to_read_from_step2:
                    if file_path not in [f.get('path', '') for f in accumulated_files]:
                        try:
                            file_contents = get_file_contents(github_repo, github_token, [file_path])
                            if file_contents and file_contents[0].get('content'):
                                accumulated_files.append({
                                    "path": file_path,
                                    "content": file_contents[0]['content'],
                                    "truncated": file_contents[0].get('truncated', False)
                                })
                                progress_messages.append(f"✅ {file_path} 파일을 읽었습니다. (2단계 결과 기반)")
                                context['readFiles'] = accumulated_files
                        except:
                            continue
        
        # 프롬프트 생성 (단계별로 다른 작업 수행)
        if step_number == 1:
            # 1단계: 프로젝트 분석
            if initial_prompt_func:
                prompt = initial_prompt_func(context, user_message, accumulated_files, accumulated_commits, step_number)
            else:
                # 기본 프롬프트 생성 (에이전트별로 다름)
                prompt = f"분석을 시작합니다. 컨텍스트: {json.dumps(context, ensure_ascii=False)[:500]}"
        else:
            # 2단계 이상: 이전 단계 결과를 보여주고 다음 단계 수행
            if followup_prompt_func:
                prompt = followup_prompt_func(context, current_result, user_message, accumulated_files, accumulated_commits, step_number, all_steps)
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
            
            # 단계 완료 메시지 추가
            if agent_type == "progress_analysis_agent":
                if step_number == 1:
                    progress_messages.append("✅ 1단계 완료: 프로젝트 분석 완료")
                elif step_number == 2:
                    progress_messages.append("✅ 2단계 완료: 필요한 기능 분석 완료")
                elif step_number == 3:
                    progress_messages.append("✅ 3단계 완료: 구현된 기능 확인 완료")
                elif step_number == 4:
                    progress_messages.append("✅ 4단계 완료: 미구현 기능 분석 완료")
                elif step_number == 5:
                    progress_messages.append("✅ 5단계 완료: 평가 및 진행도 계산 완료")
            elif agent_type == "task_completion_agent":
                if step_number == 1:
                    progress_messages.append("✅ 1단계 완료: Task 요구사항 분석 완료")
                elif step_number == 2:
                    progress_messages.append("✅ 2단계 완료: 코드 변경사항 분석 완료")
                elif step_number == 3:
                    progress_messages.append("✅ 3단계 완료: Task 완료 여부 판단 완료")
            
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
            
            # Task 완료 확인 에이전트: 2단계에서 예상 위치의 파일 읽기
            if agent_type == "task_completion_agent" and github_repo and step_number == 2:
                # 1단계 결과에서 expectedLocation 확인
                step1_result = all_steps[0] if len(all_steps) > 0 else {}
                expected_location = step1_result.get('expectedLocation', '')
                
                if expected_location and not accumulated_files:
                    print(f"[Multi-Step Agent] Task 완료 확인 - 2단계에서 파일 읽기: {expected_location}")
                    progress_messages.append(f"📄 예상 위치의 파일을 읽는 중: {expected_location}")
                    
                    # expectedLocation 기반 파일 경로 추론
                    files_to_read = []
                    
                    # expectedLocation이 파일 경로인 경우
                    if expected_location.endswith(('.js', '.jsx', '.ts', '.tsx', '.py')):
                        files_to_read.append(expected_location)
                    
                    # 디렉토리인 경우 해당 디렉토리의 파일 목록 가져오기
                    elif '/' in expected_location:
                        try:
                            dir_files = list_directory_contents(github_repo, github_token, expected_location)
                            files_to_read.extend(dir_files[:5])  # 최대 5개만
                        except:
                            pass
                    
                    # Task 제목 기반 추가 파일 추론
                    task = context.get('task', {})
                    task_title = task.get('title', '').lower()
                    
                    if '로그인' in task_title or 'login' in task_title:
                        files_to_read.extend([
                            "backend/routes/user.js",
                            "backend/controllers/userController.js"
                        ])
                    elif 'github' in task_title:
                        files_to_read.extend([
                            "backend/routes/github.js",
                            "backend/controllers/githubController.js"
                        ])
                    
                    # 중복 제거 및 최대 8개로 제한
                    files_to_read = list(set(files_to_read))[:8]
                    
                    # 파일 읽기
                    for file_path in files_to_read:
                        if file_path not in [f.get('path', '') for f in accumulated_files]:
                            try:
                                file_contents = get_file_contents(github_repo, github_token, [file_path], max_lines_per_file=300)
                                if file_contents and file_contents[0].get('content'):
                                    accumulated_files.append({
                                        "path": file_path,
                                        "content": file_contents[0]['content'],
                                        "truncated": file_contents[0].get('truncated', False)
                                    })
                                    progress_messages.append(f"✅ {file_path} 파일을 읽었습니다.")
                                    context['readFiles'] = accumulated_files
                            except Exception as e:
                                print(f"[Multi-Step Agent] Task 완료 확인 - 파일 읽기 실패 ({file_path}): {e}")
                                continue
                    
                    if accumulated_files:
                        print(f"[Multi-Step Agent] Task 완료 확인 - {len(accumulated_files)}개 파일 읽기 완료")
            
            # 진행도 분석의 경우 소스코드 구조 파악을 위한 추가 파일 읽기
            if agent_type == "progress_analysis_agent" and github_repo:
                if step_number == 1:
                    # 1단계: README와 설정 파일 읽기 (이미 위에서 처리됨)
                    pass
                elif step_number == 2:
                    # 2단계: 2단계 결과 기반 파일 읽기 + 일반적인 API 라우트 파일들 읽기
                    progress_messages.append("🔍 API 엔드포인트를 파악하기 위해 라우트 파일들을 찾는 중...")
                    
                    # 2단계에서 추론한 파일들은 이미 위에서 읽었으므로, 추가로 일반적인 파일들도 읽기
                    # 백엔드 API 라우트 파일들 (2단계에서 읽지 못한 경우를 대비)
                    backend_routes = [
                        "backend/routes/user.js", "backend/routes/project.js", "backend/routes/task.js",
                        "backend/routes/ai.js", "backend/routes/github.js", "backend/routes/progress.js",
                        "backend/routes/index.js", "backend/app.js"
                    ]
                    
                    # 프론트엔드 API 호출 파일들
                    frontend_api = [
                        "morpheus-react/web/src/api/user.js", "morpheus-react/web/src/api/project.js",
                        "morpheus-react/web/src/api/task.js", "morpheus-react/web/src/api/ai.js",
                        "morpheus-react/web/src/api/github.js"
                    ]
                    
                    # 컨트롤러 파일들
                    controllers = [
                        "backend/controllers/userController.js", "backend/controllers/projectController.js",
                        "backend/controllers/taskController.js", "backend/controllers/aiController.js",
                        "backend/controllers/githubController.js", "backend/controllers/progressController.js"
                    ]
                    
                    all_files_to_read = backend_routes + frontend_api + controllers
                    
                    for file_path in all_files_to_read:
                        if file_path not in [f.get('path', '') for f in accumulated_files]:
                            try:
                                file_contents = get_file_contents(github_repo, github_token, [file_path])
                                if file_contents and file_contents[0].get('content'):
                                    accumulated_files.append({
                                        "path": file_path,
                                        "content": file_contents[0]['content'],
                                        "truncated": file_contents[0].get('truncated', False)
                                    })
                                    progress_messages.append(f"✅ {file_path} 파일을 읽었습니다.")
                                    context['readFiles'] = accumulated_files
                            except:
                                continue
                
                elif step_number == 3:
                    # 3단계: 2단계 결과 기반 페이지/컴포넌트 파일 읽기 + 동적 탐색
                    progress_messages.append("🔍 프로젝트 구조를 파악하여 페이지와 컴포넌트 파일들을 찾는 중...")
                    
                    # 2단계 결과에서 페이지/컴포넌트 파일 경로 추출
                    step2_result = all_steps[1] if len(all_steps) > 1 else {}
                    required_features = step2_result.get('requiredFeatures', [])
                    
                    files_from_step2 = []
                    for feat in required_features:
                        expected_loc = feat.get('expectedLocation', '')
                        feat_type = feat.get('type', '')
                        
                        if feat_type in ['page', 'component'] and expected_loc:
                            path = expected_loc.lstrip('/')
                            if path.endswith(('.jsx', '.js', '.tsx', '.ts')):
                                if path not in files_from_step2:
                                    files_from_step2.append(path)
                    
                    # 2단계에서 예상한 파일들을 우선적으로 읽기
                    read_count = 0
                    for file_path in files_from_step2:
                        if file_path not in [f.get('path', '') for f in accumulated_files] and read_count < 30:
                            try:
                                file_contents = get_file_contents(github_repo, github_token, [file_path])
                                if file_contents and file_contents[0].get('content'):
                                    accumulated_files.append({
                                        "path": file_path,
                                        "content": file_contents[0]['content'],
                                        "truncated": file_contents[0].get('truncated', False)
                                    })
                                    progress_messages.append(f"✅ {file_path} 파일을 읽었습니다. (2단계 결과 기반)")
                                    context['readFiles'] = accumulated_files
                                    read_count += 1
                            except:
                                continue
                    
                    # 추가로 동적 탐색 (2단계에서 찾지 못한 경우)
                    directories_to_explore = [
                        "morpheus-react/web/src/pages",
                        "morpheus-react/web/src/components",
                        "src/pages",
                        "src/components",
                        "web/src/pages",
                        "web/src/components",
                        "frontend/src/pages",
                        "frontend/src/components",
                        "pages",
                        "components"
                    ]
                    
                    discovered_files = []
                    for directory in directories_to_explore:
                        try:
                            files_in_dir = list_directory_contents(github_repo, github_token, directory)
                            discovered_files.extend(files_in_dir)
                            if files_in_dir:
                                progress_messages.append(f"📁 {directory} 디렉토리에서 {len(files_in_dir)}개 파일 발견")
                        except:
                            continue
                    
                    # 기존 하드코딩된 파일 목록도 포함 (확실한 파일들)
                    known_files = [
                        # 페이지 파일들
                        "morpheus-react/web/src/pages/Login.jsx",
                        "morpheus-react/web/src/pages/SignupPage.jsx",
                        "morpheus-react/web/src/pages/Home.jsx",
                        "morpheus-react/web/src/pages/ProjectPage.jsx",
                        "morpheus-react/web/src/pages/ProjectDetailPage.jsx",
                        "morpheus-react/web/src/pages/AIadvisorPage.jsx",
                        "morpheus-react/web/src/pages/TaskDetailPage.jsx",
                        "morpheus-react/web/src/pages/TaskListPage.jsx",
                        # 컴포넌트 파일들
                        "morpheus-react/web/src/components/ai/ChatBot.jsx",
                        "morpheus-react/web/src/components/tasks/TaskView.jsx",
                        "morpheus-react/web/src/components/tasks/List.jsx",
                        "morpheus-react/web/src/components/tasks/TaskCard.jsx",
                        "morpheus-react/web/src/components/projects/CreateProject.jsx",
                        "morpheus-react/web/src/components/projects/ProjectCard.jsx",
                        "morpheus-react/web/src/components/layout/Layout.jsx",
                        "morpheus-react/web/src/components/layout/CategoryBar.jsx"
                    ]
                    
                    all_files_to_read = list(set(known_files + discovered_files))  # 중복 제거
                    
                    max_files_to_read = 50  # 최대 50개로 증가
                    for file_path in all_files_to_read:
                        if file_path not in [f.get('path', '') for f in accumulated_files] and read_count < max_files_to_read:
                            try:
                                file_contents = get_file_contents(github_repo, github_token, [file_path])
                                if file_contents and file_contents[0].get('content'):
                                    accumulated_files.append({
                                        "path": file_path,
                                        "content": file_contents[0]['content'],
                                        "truncated": file_contents[0].get('truncated', False)
                                    })
                                    progress_messages.append(f"✅ {file_path} 파일을 읽었습니다.")
                                    context['readFiles'] = accumulated_files
                                    read_count += 1
                            except:
                                continue
                    
                    if read_count == 0:
                        progress_messages.append("⚠️ 페이지나 컴포넌트 파일을 찾지 못했습니다. 프로젝트 구조를 확인 중...")
                    else:
                        progress_messages.append(f"📊 총 {read_count}개의 페이지/컴포넌트 파일을 읽었습니다.")
            
            # 평가에서 제안한 파일 읽기
            if files_to_read and github_repo:
                print(f"[Multi-Step Agent] {agent_type} - 파일 읽기 시작: {files_to_read}")
                progress_messages.append(f"📄 관련 파일을 읽는 중... ({len(files_to_read)}개 파일)")
                file_contents = get_file_contents(github_repo, github_token, files_to_read)
                
                # 읽은 파일을 accumulated_files에 추가
                for file_info in file_contents:
                    if file_info.get('content'):
                        file_path = file_info.get('filePath', '')
                        # 중복 방지
                        if file_path not in [f.get('path', '') for f in accumulated_files]:
                            accumulated_files.append({
                                "path": file_path,
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

