"""
Agent 라우터 시스템
사용자 질의를 분석하여 적절한 AI agent를 선택하고 실행합니다.
모든 에이전트는 다단계 분석을 지원합니다 (최대 10단계).
"""

import json
from prompt_optimizer import (
    create_intent_classification_prompt,
    create_optimized_task_suggestion_prompt,
    create_optimized_progress_prompt,
    create_initial_completion_prompt,
    create_followup_completion_prompt,
    create_task_assignment_prompt
)
from multi_step_agent import execute_multi_step_agent
from prompt_functions import (
    create_task_suggestion_initial_prompt,
    create_task_suggestion_followup_prompt,
    create_task_suggestion_step1_prompt,
    create_task_suggestion_step2_prompt,
    create_task_suggestion_step3_prompt,
    create_task_suggestion_step4_prompt,
    create_task_suggestion_step5_prompt,
    create_progress_analysis_initial_prompt,
    create_progress_analysis_followup_prompt,
    create_task_completion_initial_prompt,
    create_task_completion_followup_prompt,
    create_general_qa_initial_prompt,
    create_general_qa_followup_prompt,
    create_task_assignment_initial_prompt,
    create_task_assignment_followup_prompt
)

def classify_intent(user_message, conversation_history, call_llm_func, project_context=None):
    """
    사용자 질의의 의도를 분석하여 적절한 agent 타입을 반환합니다.
    
    Args:
        user_message: 사용자 메시지
        conversation_history: 대화 히스토리 리스트
        call_llm_func: LLM 호출 함수 (prompt, system_prompt) -> content
        project_context: 프로젝트 컨텍스트 정보 (선택사항)
    
    Returns:
        dict: {
            "agent_type": "task_suggestion_agent|progress_analysis_agent|task_completion_agent|general_qa_agent",
            "confidence": "high|medium|low",
            "reason": "...",
            "extracted_info": {...}
        }
    """
    prompt = create_intent_classification_prompt(user_message, conversation_history, project_context)
    system_prompt = "의도 분류 전문가. 사용자 질의를 분석하여 적절한 agent를 선택합니다. 반드시 한국어로만 응답. JSON만 응답."
    
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
        
        result = json.loads(content)
        
        # 기본값 설정
        if 'agent_type' not in result:
            result['agent_type'] = 'general_qa_agent'
        if 'confidence' not in result:
            result['confidence'] = 'medium'
        
        return result
    except Exception as e:
        print(f"[Agent Router] 의도 분류 실패: {e}")
        # 기본값 반환
        return {
            "agent_type": "general_qa_agent",
            "confidence": "low",
            "reason": f"의도 분류 실패: {str(e)}",
            "extracted_info": {}
        }

def check_github_required(agent_type):
    """
    에이전트 타입에 따라 GitHub 연동이 필요한지 확인
    
    Returns:
        bool: GitHub 연동이 필요하면 True
    """
    github_required_agents = [
        "progress_analysis_agent",
        "task_completion_agent"
    ]
    return agent_type in github_required_agents

def route_to_agent(agent_type, context, call_llm_func, user_message=None):
    """
    선택된 agent에 따라 적절한 프롬프트를 생성하고 실행합니다.
    
    Args:
        agent_type: agent 타입
        context: agent 실행에 필요한 컨텍스트
        call_llm_func: LLM 호출 함수
        user_message: 사용자 메시지 (general_qa_agent인 경우 필요)
    
    Returns:
        dict: agent 실행 결과
    """
    
    # GitHub 연동 필요 여부 확인
    if check_github_required(agent_type):
        github_repo = context.get('githubRepo', '')
        if not github_repo or github_repo.strip() == '':
            agent_name = {
                "progress_analysis_agent": "진행도 분석",
                "task_completion_agent": "Task 완료 확인"
            }.get(agent_type, "이 기능")
            
            return {
                "agent_type": agent_type,
                "error": "GITHUB_REQUIRED",
                "response": {
                    "type": "error",
                    "message": f"{agent_name} 기능을 사용하려면 GitHub 저장소가 연결되어 있어야 합니다. 프로젝트 설정에서 GitHub 저장소를 연결해주세요."
                }
            }
    
    if agent_type == "task_suggestion_agent":
        return execute_task_suggestion_agent(context, call_llm_func, user_message)
    elif agent_type == "progress_analysis_agent":
        return execute_progress_analysis_agent(context, call_llm_func, user_message)
    elif agent_type == "task_completion_agent":
        return execute_task_completion_agent(context, call_llm_func, user_message)
    elif agent_type == "task_assignment_agent":
        return execute_task_assignment_agent(context, call_llm_func, user_message)
    elif agent_type == "general_qa_agent":
        return execute_general_qa_agent(context, call_llm_func, user_message)
    else:
        return {
            "error": f"알 수 없는 agent 타입: {agent_type}",
            "agent_type": agent_type
        }

def check_task_suggestion_info_sufficiency(context, user_message):
    """
    Task 제안을 위한 정보 충분성 체크
    
    Returns:
        dict: {
            "sufficient": bool,
            "missing_info": list,  # 부족한 정보 유형 리스트
            "has_project_desc": bool,
            "has_user_request": bool,
            "has_tasks": bool,
            "has_commits": bool,
            "has_issues": bool
        }
    """
    commits = context.get('commits', [])
    issues = context.get('issues', [])
    currentTasks = context.get('currentTasks', [])
    projectDescription = context.get('projectDescription', '')
    projectName = context.get('projectName', '')
    user_message = user_message or ""
    
    # 프로젝트 설명이 실제로 있는지 확인 (제목만 있는 경우 제외)
    # 백엔드에서 project.description || project.title로 보내므로,
    # projectName과 같으면 실제 설명이 없는 것으로 간주
    actual_description = projectDescription
    if projectName and projectDescription == projectName:
        actual_description = ""  # 제목만 있는 경우 설명이 없는 것으로 간주
    
    has_project_desc = actual_description and len(actual_description.strip()) > 20
    has_user_request = user_message and len(user_message.strip()) > 10
    has_tasks = len(currentTasks) > 0
    has_commits = len(commits) > 0
    has_issues = len(issues) > 0
    
    # 충분성 기준: 하나라도 있으면 충분
    sufficient = has_project_desc or has_user_request or has_tasks or has_commits or has_issues
    
    # 부족한 정보 유형 수집
    missing_info = []
    if not has_project_desc:
        missing_info.append('project_description')
    if not has_user_request:
        missing_info.append('user_request')
    if not has_tasks:
        missing_info.append('tasks')
    if not has_commits:
        missing_info.append('commits')
    if not has_issues:
        missing_info.append('issues')
    
    return {
        "sufficient": sufficient,
        "missing_info": missing_info,
        "has_project_desc": has_project_desc,
        "has_user_request": has_user_request,
        "has_tasks": has_tasks,
        "has_commits": has_commits,
        "has_issues": has_issues,
        "actual_description": actual_description,
        "project_name": projectName
    }

def generate_task_suggestion_questions(context, missing_info):
    """
    부족한 정보에 따라 적절한 질문 생성
    
    Args:
        context: 프로젝트 컨텍스트
        missing_info: 부족한 정보 유형 리스트
    
    Returns:
        dict: {
            "questions": list,
            "message": str
        }
    """
    project_name = context.get('projectName', '프로젝트')
    
    # 기본 질문들
    question_map = {
        'project_description': "프로젝트의 핵심 기능은 무엇인가요?",
        'user_request': "현재 어떤 기능을 구현하고 싶으신가요?",
        'tasks': "이미 진행 중인 작업이 있나요?",
        'commits': "프로젝트에 코드 변경 이력이 있나요?",
        'issues': "프로젝트에 이슈나 버그가 있나요?"
    }
    
    # 부족한 정보에 따라 질문 선택
    questions = []
    if 'project_description' in missing_info:
        questions.append(question_map['project_description'])
    if 'user_request' in missing_info:
        questions.append(question_map['user_request'])
    if 'tasks' in missing_info:
        questions.append(question_map['tasks'])
    
    # 기본 질문이 없으면 일반적인 질문들 추가
    if not questions:
        questions = [
            "프로젝트의 핵심 기능은 무엇인가요?",
            "현재 어떤 기능이 구현되어 있나요?",
            "다음으로 구현하고 싶은 기능은 무엇인가요?"
        ]
    
    message = "프로젝트에 대한 정보가 부족합니다. 위 질문에 답변해주시면 더 정확한 Task를 제안할 수 있습니다."
    
    # 프로젝트 이름을 포함한 메시지 포맷팅
    question_text = "\n".join([f"- {q}" for q in questions])
    full_message = f"# {project_name}\n\n{message}\n\n{question_text}"
    
    return {
        "questions": questions,
        "message": full_message
    }

def execute_task_suggestion_agent(context, call_llm_func, user_message=None):
    """Task 제안 agent 실행 (5단계 프로세스 재설계)"""
    try:
        project_name = context.get('projectName', '프로젝트')
        github_repo = context.get('githubRepo', '')
        github_token = context.get('githubToken')
        has_github = github_repo and github_repo.strip() != ''
        
        progress_messages = []
        all_steps = []
        
        # multi_step_agent의 파일 읽기 함수 import
        from multi_step_agent import get_file_contents, list_directory_contents
        
        print(f"[Agent Router] Task 제안 - 5단계 프로세스 시작 (프로젝트: {project_name})")
        
        # ===== 1단계: 프로젝트 정보 파악 =====
        print(f"[Agent Router] Task 제안 - 1단계: 프로젝트 정보 파악")
        progress_messages.append("🔍 1단계: 프로젝트 정보 파악 중...")
        
        # README 파일 읽기 (GitHub 연결 시)
        read_files_step1 = []
        if has_github:
            readme_files = ["README.md", "README.txt", "readme.md", "README", "readme"]
            for readme_file in readme_files:
                try:
                    file_contents = get_file_contents(github_repo, github_token, [readme_file])
                    if file_contents and file_contents[0].get('content'):
                        read_files_step1.append({
                            "path": file_contents[0].get('filePath', readme_file),
                            "content": file_contents[0]['content'],
                            "truncated": file_contents[0].get('truncated', False)
                        })
                        break
                except:
                    continue
        
        # 1단계 프롬프트 생성 및 LLM 호출
        prompt_step1 = create_task_suggestion_step1_prompt(context, user_message, read_files_step1, [], 1)
        system_prompt = "소프트웨어 프로젝트 분석 전문가. 반드시 한국어로 응답. JSON만 응답."
        response_step1 = call_llm_func(prompt_step1, system_prompt)
        
        # JSON 파싱
        try:
            if '```json' in response_step1:
                response_step1 = response_step1.split('```json')[1].split('```')[0].strip()
            elif '```' in response_step1:
                response_step1 = response_step1.split('```')[1].split('```')[0].strip()
            step1_result = json.loads(response_step1)
        except:
            step1_result = {}
        
        all_steps.append(step1_result)
        progress_messages.append("✅ 1단계 완료: 프로젝트 정보 파악")
        
        # ===== 2단계: 현재 Task 및 소스코드 구현 파악 =====
        print(f"[Agent Router] Task 제안 - 2단계: 현재 Task 및 소스코드 구현 파악")
        progress_messages.append("📋 2단계: 현재 Task 및 소스코드 구현 파악 중...")
        
        # 소스코드 파일 읽기 (GitHub 연결 시)
        read_files_step2 = []
        if has_github:
            # 주요 디렉토리 탐색
            project_structure = step1_result.get('projectInfo', {}).get('projectStructure', {})
            main_directories = project_structure.get('mainDirectories', [])
            
            # mainDirectories가 비어있으면 기본 디렉토리 목록 사용
            if not main_directories:
                main_directories = ["src", "app", "components", "pages", "routes", "controllers", "services", "utils", "backend", "frontend"]
            
            # 디렉토리에서 파일 찾기
            files_to_read = []
            for dir_path in main_directories[:5]:  # 최대 5개 디렉토리
                try:
                    dir_files = list_directory_contents(github_repo, github_token, dir_path)
                    # JavaScript/TypeScript/Python 파일 선택
                    code_files = [f for f in dir_files if f.endswith(('.js', '.jsx', '.ts', '.tsx', '.py'))][:10]
                    files_to_read.extend(code_files)
                    if len(files_to_read) >= 30:
                        break
                except Exception as e:
                    print(f"[Agent Router] 디렉토리 탐색 실패 ({dir_path}): {e}")
                    continue
            
            # 파일 읽기
            if files_to_read:
                file_contents = get_file_contents(github_repo, github_token, files_to_read[:30], max_lines_per_file=500)
                read_files_step2 = [
                    {
                        "path": f.get('filePath', ''),
                        "content": f.get('content', ''),
                        "truncated": f.get('truncated', False)
                    }
                    for f in file_contents if f.get('content')
                ]
                print(f"[Agent Router] Task 제안 - 2단계에서 {len(read_files_step2)}개 파일 읽음")
        
        # 2단계 프롬프트 생성 및 LLM 호출
        prompt_step2 = create_task_suggestion_step2_prompt(context, user_message, read_files_step2, [], 2, step1_result)
        response_step2 = call_llm_func(prompt_step2, system_prompt)
        
        # JSON 파싱
        try:
            if '```json' in response_step2:
                response_step2 = response_step2.split('```json')[1].split('```')[0].strip()
            elif '```' in response_step2:
                response_step2 = response_step2.split('```')[1].split('```')[0].strip()
            step2_result = json.loads(response_step2)
        except:
            step2_result = {}
        
        all_steps.append(step2_result)
        progress_messages.append("✅ 2단계 완료: 현재 Task 및 소스코드 구현 파악")
        
        # ===== 3단계: 부족한 Task 제안 =====
        print(f"[Agent Router] Task 제안 - 3단계: 부족한 Task 제안")
        progress_messages.append("💡 3단계: 부족한 Task 제안 중...")
        
        prompt_step3 = create_task_suggestion_step3_prompt(context, user_message, [], [], 3, all_steps)
        response_step3 = call_llm_func(prompt_step3, system_prompt)
        
        # JSON 파싱
        try:
            if '```json' in response_step3:
                response_step3 = response_step3.split('```json')[1].split('```')[0].strip()
            elif '```' in response_step3:
                response_step3 = response_step3.split('```')[1].split('```')[0].strip()
            step3_result = json.loads(response_step3)
        except:
            step3_result = {}
        
        all_steps.append(step3_result)
        progress_messages.append("✅ 3단계 완료: 부족한 Task 제안")
        
        # ===== 4단계: 보안 및 리팩토링 개선점 제안 (GitHub 연결 시만) =====
        step4_result = {}
        if has_github:
            print(f"[Agent Router] Task 제안 - 4단계: 보안 및 리팩토링 개선점 제안")
            progress_messages.append("🔒 4단계: 보안 및 리팩토링 개선점 제안 중...")
            
            prompt_step4 = create_task_suggestion_step4_prompt(context, user_message, read_files_step2, [], 4, all_steps)
            response_step4 = call_llm_func(prompt_step4, system_prompt)
            
            # JSON 파싱
            try:
                if '```json' in response_step4:
                    response_step4 = response_step4.split('```json')[1].split('```')[0].strip()
                elif '```' in response_step4:
                    response_step4 = response_step4.split('```')[1].split('```')[0].strip()
                step4_result = json.loads(response_step4)
            except:
                step4_result = {}
            
            all_steps.append(step4_result)
            progress_messages.append("✅ 4단계 완료: 보안 및 리팩토링 개선점 제안")
        else:
            print(f"[Agent Router] Task 제안 - 4단계 건너뜀 (GitHub 미연결)")
            progress_messages.append("⏭️ 4단계 건너뜀: GitHub 미연결로 보안/리팩토링 제안 생략")
        
        # ===== 5단계: Task 형식으로 통합 및 출력 =====
        print(f"[Agent Router] Task 제안 - 5단계: Task 형식으로 통합 및 출력")
        progress_messages.append("📊 5단계: Task 형식으로 통합 및 출력 중...")
        
        prompt_step5 = create_task_suggestion_step5_prompt(context, user_message, [], [], 5, all_steps)
        response_step5 = call_llm_func(prompt_step5, system_prompt)
        
        # JSON 파싱
        try:
            if '```json' in response_step5:
                response_step5 = response_step5.split('```json')[1].split('```')[0].strip()
            elif '```' in response_step5:
                response_step5 = response_step5.split('```')[1].split('```')[0].strip()
            step5_result = json.loads(response_step5)
        except:
            step5_result = {}
        
        suggestions = step5_result.get('suggestions', [])
        
        if not isinstance(suggestions, list):
            suggestions = [suggestions] if suggestions else []
        
        # 빈 배열 처리
        if len(suggestions) == 0:
            message = f"# {project_name}\n\n현재 프로젝트 상태를 분석한 결과, 추가로 제안할 Task가 없습니다.\n\n프로젝트가 잘 관리되고 있습니다! 🎉"
            return {
                "agent_type": "task_suggestion_agent",
                "response": {
                    "type": "no_suggestions",
                    "message": message,
                    "suggestions": []
                },
                "analysis_steps": 5,
                "confidence": "medium",
                "progress_messages": progress_messages
            }
        
        # 카테고리별 정렬
        category_order = {'security': 0, 'refactor': 1, 'feature': 2, 'performance': 3, 'maintenance': 4}
        suggestions.sort(key=lambda x: (
            category_order.get(x.get('category', 'maintenance'), 99),
            {'High': 0, 'Medium': 1, 'Low': 2}.get(x.get('priority', 'Low'), 2)
        ))
        
        # 상세 메시지 생성 (마크다운 형식)
        message_parts = [
            f"# {project_name}",
            "",
            f"## 💡 {len(suggestions)}개의 Task를 제안했습니다",
            ""
        ]
        
        # 카테고리별 그룹화
        by_category = {}
        for suggestion in suggestions:
            category = suggestion.get('category', 'maintenance')
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(suggestion)
        
        category_kr = {
            'feature': '기능 추가',
            'refactor': '리팩토링',
            'security': '보안',
            'performance': '성능',
            'maintenance': '유지보수'
        }
        
        for category, items in by_category.items():
            message_parts.append(f"### {category_kr.get(category, category)} ({len(items)}개)")
            message_parts.append("")
            for i, item in enumerate(items, 1):
                title = item.get('title', '제목 없음')
                description = item.get('description', '')
                priority = item.get('priority', 'Low')
                estimated_hours = item.get('estimatedHours', 0)
                reason = item.get('reason', '')
                location = item.get('location', '')
                
                message_parts.append(f"#### {i}. {title}")
                message_parts.append("")
                if description:
                    message_parts.append(f"**설명**: {description}")
                    message_parts.append("")
                message_parts.append(f"- **우선순위**: {priority}")
                message_parts.append(f"- **예상 시간**: {estimated_hours}시간")
                if location:
                    message_parts.append(f"- **위치**: {location}")
                if reason:
                    message_parts.append(f"- **추천 이유**: {reason}")
                message_parts.append("")
        
        message_parts.append("---")
        message_parts.append("")
        message_parts.append("💡 각 Task를 프로젝트에 추가하려면 Task 제목을 클릭하거나 '추가' 버튼을 사용하세요.")
        
        message = "\n".join(message_parts)
        progress_messages.append("✅ 5단계 완료: Task 형식으로 통합 및 출력")
        
        print(f"[Agent Router] Task 제안 - {len(suggestions)}개 제안 생성 완료")
        
        return {
            "agent_type": "task_suggestion_agent",
            "response": {
                "type": "task_suggestions",
                "suggestions": suggestions,
                "message": message
            },
            "analysis_steps": 5,
            "confidence": "high",
            "progress_messages": progress_messages,
            "all_steps": all_steps
        }
    except Exception as e:
        print(f"[Agent Router] Task 제안 agent 실행 실패: {e}")
        import traceback
        print(traceback.format_exc())
        project_name = context.get('projectName', '프로젝트')
        return {
            "agent_type": "task_suggestion_agent",
            "error": f"Task 제안 생성 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": f"# {project_name}\n\nTask 제안을 생성하는 중 오류가 발생했습니다."
            }
        }

def execute_progress_analysis_agent(context, call_llm_func, user_message=None):
    """진행도 분석 agent 실행 (다단계 분석)"""
    try:
        # 진행도 분석용 LLM 호출 함수 (더 긴 응답을 위해 토큰 제한 증가)
        # app.py에서 전달된 call_llm_func를 래핑하여 토큰 제한 증가
        import os
        USE_OPENAI = os.getenv('USE_OPENAI', 'false').lower() == 'true'
        
        def call_llm_with_more_tokens(prompt, system_prompt):
            # app.py의 함수를 직접 호출하기 위해 import
            from app import call_openai, call_ollama
            if USE_OPENAI:
                return call_openai(prompt, system_prompt, max_tokens=3000)
            else:
                return call_ollama(prompt, system_prompt, max_tokens=3000)
        
        result = execute_multi_step_agent(
            agent_type="progress_analysis_agent",
            context=context,
            call_llm_func=call_llm_with_more_tokens,
            user_message=user_message,
            initial_prompt_func=create_progress_analysis_initial_prompt,
            followup_prompt_func=create_progress_analysis_followup_prompt,
            system_prompt="프로젝트 관리 전문가. 진행도 분석 및 예측. 반드시 한국어로 응답. JSON 형식으로 응답하되, narrativeResponse 필드에는 긴 문장 형태의 상세한 설명을 포함하세요."
        )
        
        # 결과 처리 - 단계별 결과를 합쳐서 최종 응답 생성
        all_steps = result.get('all_steps', [])
        
        # 각 단계의 결과 수집
        step1_result = all_steps[0] if len(all_steps) > 0 else {}
        step2_result = all_steps[1] if len(all_steps) > 1 else {}
        step3_result = all_steps[2] if len(all_steps) > 2 else {}
        step4_result = all_steps[3] if len(all_steps) > 3 else {}
        step5_result = all_steps[4] if len(all_steps) > 4 else {}
        
        # 각 단계 결과 검증
        validation_errors = []
        
        # 1단계 검증: 핵심 기능이 3-6개이고, 인프라가 포함되지 않았는지 확인
        core_features = step1_result.get('coreFeatures', [])
        if len(core_features) < 3 or len(core_features) > 6:
            validation_errors.append(f"1단계 검증 실패: 핵심 기능이 {len(core_features)}개입니다. (3-6개여야 함)")
        
        # 인프라가 핵심 기능에 포함되지 않았는지 확인
        infrastructure_keywords = ['인프라', 'infrastructure', '데이터베이스', 'database', '미들웨어', 'middleware', 'db', '연결']
        for cf in core_features:
            cf_name = cf.get('name', '').lower()
            if any(keyword in cf_name for keyword in infrastructure_keywords):
                validation_errors.append(f"1단계 검증 실패: 인프라 기능 '{cf.get('name')}'이 핵심 기능에 포함되어 있습니다.")
        
        # 2단계 검증: 각 핵심 기능당 세부 기능이 있는지 확인
        required_features = step2_result.get('requiredFeatures', [])
        if required_features:
            core_feature_ids = {cf.get('id', '') for cf in core_features}
            required_feature_ids = {rf.get('coreFeatureId', '') for rf in required_features if rf.get('coreFeatureId')}
            
            for cf_id in core_feature_ids:
                cf_features = [rf for rf in required_features if rf.get('coreFeatureId') == cf_id]
                if len(cf_features) < 3:
                    cf_name = next((cf.get('name', '') for cf in core_features if cf.get('id') == cf_id), '알 수 없음')
                    validation_errors.append(f"2단계 검증 실패: 핵심 기능 '{cf_name}'에 세부 기능이 {len(cf_features)}개만 있습니다. (최소 3개 필요)")
        
        # 3단계 검증: 핵심 기능별 진행도가 계산되었는지 확인
        core_feature_progress = step3_result.get('coreFeatureProgress', [])
        if core_features and not core_feature_progress:
            validation_errors.append("3단계 검증 실패: 핵심 기능별 진행도가 계산되지 않았습니다.")
        
        # 4단계 검증: 카운트가 일치하는지 확인
        implemented_features = step3_result.get('implementedFeatures', [])
        missing_features = step4_result.get('missingFeatures', []) if step4_result else []
        
        total_required = len(required_features)
        total_implemented = len(implemented_features)
        total_missing = len(missing_features)
        
        if total_required != total_implemented + total_missing:
            validation_errors.append(f"4단계 검증 실패: 필요한 기능 수({total_required}) ≠ 구현된 기능 수({total_implemented}) + 미구현 기능 수({total_missing})")
        
        # 검증 오류가 있으면 로그에 기록
        if validation_errors:
            print(f"[Agent Router] 검증 오류 발견:")
            for error in validation_errors:
                print(f"  - {error}")
        else:
            print(f"[Agent Router] 모든 단계 검증 통과")
        
        # 최종 분석 결과 구성
        analysis = step5_result if step5_result else (all_steps[-1] if all_steps else {})
        
        # 단계별 결과가 있으면 최종 narrativeResponse 생성
        if step1_result and step2_result and step3_result:
            # 프로젝트 이름과 설명을 실제 값으로 채우기
            project_name = step1_result.get('projectName', '')
            if not project_name or project_name == '프로젝트' or project_name.startswith('['):
                # context에서 프로젝트 이름 가져오기
                project_name = context.get('projectName', '프로젝트')
            
            project_desc = step1_result.get('projectDescription', '')
            if not project_desc or project_desc.startswith('['):
                # context에서 프로젝트 설명 가져오기
                project_desc = context.get('projectDescription', '')
            required_features = step2_result.get('requiredFeatures', [])
            implemented_features = step3_result.get('implementedFeatures', [])
            missing_features = step4_result.get('missingFeatures', []) if step4_result else []
            core_features = step1_result.get('coreFeatures', [])
            core_feature_progress = step3_result.get('coreFeatureProgress', [])
            
            # 인프라 기능 필터링 (진행도 분석에서 제외)
            infrastructure_keywords = ['인프라', 'infrastructure', '데이터베이스', 'database', '미들웨어', 'middleware', 'db', '연결', 'jwt', 'cors', '인증']
            
            # required_features에서 인프라 제외
            required_features = [rf for rf in required_features if rf.get('type', '') != 'infrastructure' and not any(kw in rf.get('name', '').lower() for kw in infrastructure_keywords)]
            
            # implemented_features에서 인프라 제외
            implemented_features = [imf for imf in implemented_features if imf.get('type', '') != 'infrastructure' and not any(kw in imf.get('name', '').lower() for kw in infrastructure_keywords)]
            
            # missing_features에서 인프라 제외
            missing_features = [mf for mf in missing_features if not any(kw in mf.get('name', '').lower() for kw in infrastructure_keywords)]
            
            # 기본 변수 정의 (항상 사용되므로 먼저 정의, 인프라 제외 후)
            total_required = len(required_features)
            total_implemented = len(implemented_features)
            total_missing = len(missing_features)
            
            # 기본 진행도 계산: 핵심 기능별 진행도를 가중 평균으로 계산
            if core_feature_progress and core_features:
                # 각 핵심 기능의 weight를 가져와서 가중 평균 계산
                total_weighted_progress = 0
                total_weight = 0
                for cf_progress in core_feature_progress:
                    cf_id = cf_progress.get('coreFeatureId', '')
                    # 해당 핵심 기능의 weight 찾기
                    cf_weight = 1.0
                    for cf in core_features:
                        if cf.get('id', '') == cf_id:
                            cf_weight = cf.get('weight', 1.0)
                            break
                    progress_value = cf_progress.get('progress', 0)
                    total_weighted_progress += progress_value * cf_weight
                    total_weight += cf_weight
                
                base_progress = round((total_weighted_progress / total_weight) if total_weight > 0 else 0, 1)
            else:
                # 기존 방식: 전체 기능 수로 계산
                base_progress = round((total_implemented / total_required * 100) if total_required > 0 else 0, 1)
            
            # 테스트/배포 비율 적용하여 최종 진행도 계산
            test_deployment_ratio = step5_result.get('testDeploymentRatio', 0) if step5_result else 0
            test_deployment_progress = step5_result.get('testDeploymentProgress', 0) if step5_result else 0
            
            if test_deployment_ratio > 0 and test_deployment_progress >= 0:
                # 테스트/배포 비율 적용: 기본 진행도 × (1 - 비율) + 테스트/배포 진행도 × 비율
                ratio_decimal = test_deployment_ratio / 100.0
                progress = round(base_progress * (1 - ratio_decimal) + test_deployment_progress * ratio_decimal, 1)
            else:
                # 테스트/배포 비율이 0이거나 없으면 기본 진행도 사용
                progress = base_progress
            
            # 구현된 기능 목록 생성 (페이지, API, 컴포넌트, 테스트/배포로 분류)
            # 인프라는 제외
            # 프로젝트 특성에 따라 유동적으로 소제목 생성
            pages_list = []
            apis_list = []
            components_list = []
            test_deployment_list = []
            
            for feat in implemented_features:
                name = feat.get('name', '')
                feat_type = feat.get('type', 'other')
                location = feat.get('location', feat.get('filePath', ''))
                
                # 인프라 기능은 건너뛰기
                if feat_type == 'infrastructure' or any(kw in name.lower() for kw in infrastructure_keywords):
                    continue
                
                if feat_type == 'page':
                    pages_list.append(f"- **{name}** {location}")
                elif feat_type == 'api':
                    apis_list.append(f"- **{name}** {location}")
                elif feat_type == 'component':
                    components_list.append(f"- **{name}** {location}")
                elif feat_type == 'test_deployment':
                    test_deployment_list.append(f"- **{name}** {location}")
            
            # 미구현 기능 목록 생성 (간단하게)
            missing_list = []
            for feat in missing_features:
                name = feat.get('name', '')
                expected_loc = feat.get('expectedLocation', '')
                missing_list.append(f"- **{name}**: {expected_loc}")
            
            # 예상 완성일 계산 (간단하게)
            estimated_date = step5_result.get('estimatedCompletionDate') if step5_result else None
            if not estimated_date:
                # 진행도에 따라 간단한 예상일 계산
                if progress >= 80:
                    estimated_date = "곧 완성 예상"
                elif progress >= 50:
                    estimated_date = "2-3주 내 완성 예상"
                elif progress >= 30:
                    estimated_date = "1-2개월 내 완성 예상"
                else:
                    estimated_date = "완성 시기 미정"
            
            # 총평 생성 (2-3줄)
            total_evaluation = f"현재 프로젝트는 {progress}% 진행되었으며, 핵심 기능 {total_implemented}개가 구현되어 있습니다. "
            if total_missing > 0:
                missing_names = ', '.join([f.get('name', '') for f in missing_features[:3]])
                total_evaluation += f"주요 미구현 기능으로는 {missing_names} 등이 있으며, "
            total_evaluation += f"{'안정적으로 진행 중' if progress >= 70 else '추가 개발이 필요' if progress >= 40 else '초기 단계'}입니다."
            
            # narrativeResponse 생성 (프로젝트 특성에 따라 유동적으로 소제목 생성)
            # 프로젝트 설명은 타이틀 없이 내용만 포함
            # 페이지나 컴포넌트가 없으면 해당 소제목 생략
            sections = []
            
            if pages_list:
                sections.append(f"#### 페이지\n{chr(10).join(pages_list)}")
            
            if apis_list:
                sections.append(f"#### API\n{chr(10).join(apis_list)}")
            
            if components_list:
                sections.append(f"#### 컴포넌트\n{chr(10).join(components_list)}")
            
            # 인프라는 제외 (진행도 분석에서 제외)
            
            if test_deployment_list:
                sections.append(f"#### 테스트/배포\n{chr(10).join(test_deployment_list)}")
            
            implemented_section = "\n\n".join(sections) if sections else "없음"
            
            # 평가 섹션: 핵심 기능별 진행도 표시
            core_progress_section = ""
            if core_feature_progress:
                core_progress_lines = []
                for cf_progress in core_feature_progress:
                    cf_name = cf_progress.get('coreFeatureName', '')
                    cf_progress_value = cf_progress.get('progress', 0)
                    cf_implemented = cf_progress.get('implementedCount', 0)
                    cf_required = cf_progress.get('requiredCount', 0)
                    cf_missing = cf_required - cf_implemented
                    core_progress_lines.append(f"- **{cf_name}**: {cf_progress_value}% (완성된 기능 {cf_implemented}개, 구현해야 할 기능 {cf_missing}개)")
                core_progress_section = "\n".join(core_progress_lines)
            
            # 테스트/배포 정보 추출
            test_deployment_required = step5_result.get('testDeploymentRequiredCount', 0) if step5_result else 0
            test_deployment_completed = step5_result.get('testDeploymentCompletedCount', 0) if step5_result else 0
            
            # 평가 섹션 생성
            evaluation_parts = []
            if core_progress_section:
                evaluation_parts.append(core_progress_section)
            
            # 테스트/배포 진행도 (있는 경우)
            if test_deployment_ratio > 0:
                evaluation_parts.append(f"테스트/배포 진행도: {test_deployment_progress}% (완성된 기능 {test_deployment_completed}개, 필요한 기능 {test_deployment_required}개)")
            
            # 전체 진행도만 표시 (기능 구현 진행도는 제거)
            evaluation_parts.append(f"전체 진행도: {progress}% (완성된 기능 {total_implemented}개, 구현해야 할 기능 {total_missing}개)")
            
            evaluation_section = "\n".join(evaluation_parts)
            
            # 예상 완성일을 남은 일수로 계산
            remaining_days = None
            if estimated_date and estimated_date != "완성 시기 미정" and estimated_date != "곧 완성 예상":
                try:
                    from datetime import datetime
                    today = datetime.now()
                    # "YYYY-MM-DD" 형식 파싱 시도
                    if "-" in estimated_date and len(estimated_date) == 10:
                        target_date = datetime.strptime(estimated_date, "%Y-%m-%d")
                        remaining_days = (target_date - today).days
                    elif "주" in estimated_date:
                        # "2-3주 내 완성 예상" 같은 경우
                        import re
                        weeks_match = re.search(r'(\d+)', estimated_date)
                        if weeks_match:
                            weeks = int(weeks_match.group(1))
                            remaining_days = weeks * 7
                except:
                    pass
            
            # 예상일 표시 형식
            if remaining_days is not None and remaining_days > 0:
                estimated_display = f"예상일 ({remaining_days}일)"
            elif estimated_date:
                estimated_display = f"예상일 ({estimated_date})"
            else:
                estimated_display = "예상일 (미정)"
            
            # 평가 섹션을 "완성된 기능 n개, 구현해야 할 기능 n개로 진행도 %입니다" 형식으로 변경
            narrative_response = f"""{project_desc}

### 구현된 기능

{implemented_section}

### 미구현 기능
{chr(10).join(missing_list) if missing_list else "없음"}

### 평가
{evaluation_section}

{progress}% | {estimated_display}"""
            
            analysis['narrativeResponse'] = narrative_response
            analysis['currentProgress'] = progress
        
        # 진행도 계산 검증
        calculated_progress = analysis.get('currentProgress', 0)
        base_progress_calc = analysis.get('baseProgress', 0)
        test_deployment_ratio = analysis.get('testDeploymentRatio', 0)
        test_deployment_progress = analysis.get('testDeploymentProgress', 0)
        
        # 테스트/배포 비율 적용 검증
        if test_deployment_ratio > 0 and test_deployment_progress >= 0:
            expected_progress = round(base_progress_calc * (1 - test_deployment_ratio / 100.0) + test_deployment_progress * (test_deployment_ratio / 100.0), 1)
            if abs(calculated_progress - expected_progress) > 1.0:
                print(f"[Agent Router] 진행도 계산 검증 실패: 계산된 진행도({calculated_progress})와 예상 진행도({expected_progress})가 불일치합니다.")
                # 자동으로 수정
                calculated_progress = expected_progress
                analysis['currentProgress'] = calculated_progress
        
        # narrativeResponse에서 진행도 계산값 추출하여 currentProgress와 일치시키기 (백업)
        narrative_response = analysis.get('narrativeResponse', '')
        if narrative_response:
            import re
            # "전체 진행도: [숫자]%" 패턴 찾기
            progress_match = re.search(r'전체 진행도:\s*(\d+(?:\.\d+)?)\s*%', narrative_response)
            if progress_match:
                narrative_progress = float(progress_match.group(1))
                # currentProgress와 일치시키기 (±5% 이내)
                if abs(calculated_progress - narrative_progress) > 5:
                    print(f"[Agent Router] 진행도 불일치 감지: currentProgress={calculated_progress}, narrativeResponse={narrative_progress}, 일치시킴")
                    analysis['currentProgress'] = round(calculated_progress)
                    # narrativeResponse도 업데이트 필요 시 여기서 처리
        
        # 사용자 친화적인 상세 메시지 생성
        # narrativeResponse가 있으면 우선 사용 (마크다운 형식)
        narrative_response = analysis.get('narrativeResponse', '')
        
        # 프로젝트 이름 가져오기 (context에서)
        project_name = context.get('projectName', '프로젝트')
        
        if narrative_response and len(narrative_response) > 100:
            # 프로젝트 이름을 맨 위에 추가하고 narrativeResponse를 메인 메시지로 사용
            # 불필요한 타이틀은 제거하고 내용만 표시
            message = f"# {project_name}\n\n{narrative_response}"
            
            # 추가 정보는 요약하여 포함
            progress = analysis.get('currentProgress', 0)
            trend = analysis.get('activityTrend', 'stable')
            trend_kr = {
                'increasing': '증가 중',
                'stable': '안정적',
                'decreasing': '감소 중'
            }.get(trend, trend)
            
            delay_risk = analysis.get('delayRisk', 'Low')
            delay_risk_kr = {
                'Low': '낮음',
                'Medium': '보통',
                'High': '높음'
            }.get(delay_risk, delay_risk)
            
            estimated_date = analysis.get('estimatedCompletionDate')
            
            # 메시지 끝에 핵심 지표 추가 (마크다운 형식) - 진행도와 예상일만 표시
            # 예상일을 남은 일수로 계산
            remaining_days = None
            if estimated_date and estimated_date != "완성 시기 미정" and estimated_date != "곧 완성 예상":
                try:
                    from datetime import datetime
                    today = datetime.now()
                    # "YYYY-MM-DD" 형식 파싱 시도
                    if "-" in estimated_date and len(estimated_date) == 10:
                        target_date = datetime.strptime(estimated_date, "%Y-%m-%d")
                        remaining_days = (target_date - today).days
                    elif "주" in estimated_date:
                        # "2-3주 내 완성 예상" 같은 경우
                        import re
                        weeks_match = re.search(r'(\d+)', estimated_date)
                        if weeks_match:
                            weeks = int(weeks_match.group(1))
                            remaining_days = weeks * 7
                except:
                    pass
            
            # 예상일 표시 형식
            if remaining_days is not None and remaining_days > 0:
                estimated_display = f"예상일 ({remaining_days}일)"
            elif estimated_date:
                estimated_display = f"예상일 ({estimated_date})"
            else:
                estimated_display = "예상일 (미정)"
            
            message += f"\n\n---\n\n## 📊 핵심 지표\n\n"
            message += f"- **진행도**: {progress}%\n"
            message += f"- **{estimated_display}**\n"
        else:
            # narrativeResponse가 없거나 짧으면 더 상세한 메시지 생성
            progress = analysis.get('currentProgress', 0)
            trend = analysis.get('activityTrend', 'stable')
            trend_kr = {
                'increasing': '증가 중',
                'stable': '안정적',
                'decreasing': '감소 중'
            }.get(trend, trend)
            
            delay_risk = analysis.get('delayRisk', 'Low')
            delay_risk_kr = {
                'Low': '낮음',
                'Medium': '보통',
                'High': '높음'
            }.get(delay_risk, delay_risk)
            
            estimated_date = analysis.get('estimatedCompletionDate')
            insights = analysis.get('insights', [])
            recommendations = analysis.get('recommendations', [])
            recent_activity = analysis.get('recentActivity', {})
            key_metrics = analysis.get('keyMetrics', {})
            
            # 마크다운 형식의 상세 메시지 구성
            message_parts = [
                f"# 📊 프로젝트 진행도 분석",
                f"",
                f"## 현재 진행 상황",
                f"",
                f"- **진행도**: {progress}%",
                f"- **활동 추세**: {trend_kr}",
                f"- **지연 위험도**: {delay_risk_kr}"
            ]
            
            if estimated_date:
                message_parts.append(f"- **예상 완료일**: {estimated_date}")
            
            if recent_activity:
                message_parts.append(f"")
                message_parts.append(f"## 최근 활동")
                if recent_activity.get('last7Days'):
                    message_parts.append(f"- **최근 7일**: {recent_activity.get('last7Days')}")
                if recent_activity.get('last30Days'):
                    message_parts.append(f"- **최근 30일**: {recent_activity.get('last30Days')}")
            
            if insights:
                message_parts.append(f"")
                message_parts.append(f"## 주요 인사이트")
                for i, insight in enumerate(insights[:5], 1):  # 최대 5개
                    message_parts.append(f"{i}. {insight}")
            
            if recommendations:
                message_parts.append(f"")
                message_parts.append(f"## 개선 제안")
                for i, rec in enumerate(recommendations[:5], 1):  # 최대 5개
                    message_parts.append(f"{i}. {rec}")
            
            if key_metrics:
                message_parts.append(f"")
                message_parts.append(f"## 주요 지표")
                if key_metrics.get('averageCommitsPerDay'):
                    message_parts.append(f"- **평균 일일 커밋**: {key_metrics.get('averageCommitsPerDay', 0):.1f}개")
                if key_metrics.get('taskCompletionRate'):
                    message_parts.append(f"- **Task 완료율**: {key_metrics.get('taskCompletionRate', 0):.1f}%")
                if key_metrics.get('codeGrowthRate'):
                    message_parts.append(f"- **코드 성장률**: {key_metrics.get('codeGrowthRate', 'N/A')}")
            
            # narrativeResponse가 없으면 기본 상세 설명 추가
            if not narrative_response or len(narrative_response) <= 100:
                message_parts.append(f"")
                message_parts.append(f"## 프로젝트 상태 요약")
                message_parts.append(f"")
                message_parts.append(f"현재 프로젝트는 {progress}% 진행되었으며, 활동 추세는 {trend_kr}입니다. ")
                if delay_risk_kr == '높음':
                    message_parts.append(f"지연 위험이 높으므로 주의가 필요합니다. ")
                elif delay_risk_kr == '보통':
                    message_parts.append(f"지연 위험이 보통 수준이므로 계획된 일정을 지키는 것이 중요합니다. ")
                else:
                    message_parts.append(f"지연 위험이 낮아 안정적으로 진행되고 있습니다. ")
                
                if insights:
                    message_parts.append(f"주요 인사이트를 바탕으로 프로젝트를 관리하시기 바랍니다.")
            
            message = "\n".join(message_parts)
        
        return {
            "agent_type": "progress_analysis_agent",
            "response": {
                "type": "progress_analysis",
                "analysis": analysis,
                "message": message
            },
            "analysis_steps": result.get('analysis_steps', 1),
            "confidence": result.get('confidence', 'medium'),
            "progress_messages": result.get('progress_messages', [])  # 진행 상황 메시지 추가
        }
    except Exception as e:
        print(f"[Agent Router] 진행도 분석 agent 실행 실패: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "agent_type": "progress_analysis_agent",
            "error": f"진행도 분석 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "진행도 분석 중 오류가 발생했습니다."
            }
        }

def execute_task_completion_agent(context, call_llm_func, user_message=None):
    """Task 완료 확인 agent 실행 (다단계 분석)"""
    task = context.get('task')
    
    if not task:
        return {
            "agent_type": "task_completion_agent",
            "error": "Task 정보가 필요합니다.",
            "response": {
                "type": "error",
                "message": "Task 정보가 제공되지 않았습니다. Task 제목을 명시해주세요."
            }
        }
    
    system_prompt = """당신은 코드 리뷰 전문가입니다. Task 완료 여부를 판단합니다.

중요 규칙:
1. 반드시 한국어로만 응답하세요. 중국어, 영어 등 다른 언어는 절대 사용하지 마세요.
2. JSON 형식으로만 응답하세요.
3. 사용자가 지정한 Task만 분석하세요. 다른 Task는 무시하세요."""
    
    try:
        result = execute_multi_step_agent(
            agent_type="task_completion_agent",
            context=context,
            call_llm_func=call_llm_func,
            user_message=user_message,
            initial_prompt_func=create_task_completion_initial_prompt,
            followup_prompt_func=create_task_completion_followup_prompt,
            system_prompt=system_prompt
        )
        
        # 결과 처리
        final_result = result.get('response', {})
        if not isinstance(final_result, dict):
            # 마지막 단계 결과 사용
            all_steps = result.get('all_steps', [])
            if all_steps:
                final_result = all_steps[-1]
            else:
                final_result = {}
        
        # 사용자 친화적인 상세 메시지 생성
        is_completed = final_result.get('isCompleted', False)
        completion_pct = final_result.get('completionPercentage', 0)
        confidence = final_result.get('confidence', 'low')
        evidence = final_result.get('evidence', [])
        related_commits = final_result.get('relatedCommits', [])
        missing_requirements = final_result.get('missingRequirements', [])
        recommendations = final_result.get('recommendations', [])
        
        confidence_kr = {
            'high': '높음',
            'medium': '보통',
            'low': '낮음'
        }.get(confidence, confidence)
        
        # 상세 메시지 구성
        message_parts = []
        
        if is_completed:
            message_parts.append(f"✅ **Task 완료 상태: 완료됨**")
        else:
            message_parts.append(f"⏳ **Task 완료 상태: 진행 중**")
        
        message_parts.append(f"")
        message_parts.append(f"**완성도**: {completion_pct}%")
        message_parts.append(f"**신뢰도**: {confidence_kr}")
        
        if evidence:
            message_parts.append(f"")
            message_parts.append(f"**완료 근거**:")
            for i, ev in enumerate(evidence[:5], 1):  # 최대 5개
                message_parts.append(f"{i}. {ev}")
        
        if related_commits:
            message_parts.append(f"")
            message_parts.append(f"**관련 커밋**: {len(related_commits)}개 발견")
            for commit in related_commits[:3]:  # 최대 3개
                commit_msg = commit.get('message', '')[:80]
                message_parts.append(f"- {commit_msg}")
        
        if missing_requirements:
            message_parts.append(f"")
            message_parts.append(f"**부족한 요구사항**:")
            for i, req in enumerate(missing_requirements[:5], 1):  # 최대 5개
                message_parts.append(f"{i}. {req}")
        
        if recommendations:
            message_parts.append(f"")
            message_parts.append(f"**개선 제안**:")
            for i, rec in enumerate(recommendations[:5], 1):  # 최대 5개
                message_parts.append(f"{i}. {rec}")
        
        message = "\n".join(message_parts)
        
        return {
            "agent_type": "task_completion_agent",
            "response": {
                "type": "task_completion",
                "result": final_result,
                "message": message
            },
            "analysis_steps": result.get('analysis_steps', 1),
            "confidence": result.get('confidence', 'low'),
            "progress_messages": result.get('progress_messages', [])  # 진행 상황 메시지 추가
        }
    except Exception as e:
        print(f"[Agent Router] Task 완료 확인 agent 실행 실패: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "agent_type": "task_completion_agent",
            "error": f"Task 완료 확인 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "Task 완료 확인 중 오류가 발생했습니다."
            }
        }

def execute_general_qa_agent(context, call_llm_func, user_message=None):
    """일반적인 질문 답변 agent 실행 (다단계 분석)"""
    if not user_message:
        return {
            "agent_type": "general_qa_agent",
            "error": "사용자 메시지가 필요합니다.",
            "response": {
                "type": "error",
                "message": "질문을 입력해주세요."
            }
        }
    
    try:
        result = execute_multi_step_agent(
            agent_type="general_qa_agent",
            context=context,
            call_llm_func=call_llm_func,
            user_message=user_message,
            initial_prompt_func=create_general_qa_initial_prompt,
            followup_prompt_func=create_general_qa_followup_prompt,
            system_prompt="프로젝트 관리 전문가. 프로젝트 정보를 바탕으로 사용자 질문에 친절하게 답변합니다. 반드시 한국어로만 응답. JSON만 응답."
        )
        
        # 결과 처리
        final_result = result.get('response', {})
        if not isinstance(final_result, dict):
            # 마지막 단계 결과 사용
            all_steps = result.get('all_steps', [])
            if all_steps:
                final_result = all_steps[-1]
            else:
                final_result = {}
        
        can_answer = final_result.get('can_answer', True)
        message_text = final_result.get('message', '')
        details = final_result.get('details', {})
        sources = final_result.get('sources', [])
        related_info = final_result.get('relatedInfo', {})
        
        # 상세 메시지 구성
        message_parts = [message_text]
        
        if details:
            message_parts.append(f"")
            message_parts.append(f"**상세 정보**:")
            for key, value in list(details.items())[:5]:  # 최대 5개
                if isinstance(value, (str, int, float)):
                    message_parts.append(f"- {key}: {value}")
                elif isinstance(value, list):
                    message_parts.append(f"- {key}: {', '.join(map(str, value[:3]))}")
        
        if sources:
            message_parts.append(f"")
            message_parts.append(f"**참고 자료**:")
            for i, source in enumerate(sources[:5], 1):  # 최대 5개
                message_parts.append(f"{i}. {source}")
        
        if related_info:
            message_parts.append(f"")
            message_parts.append(f"**관련 정보**:")
            for key, value in list(related_info.items())[:5]:  # 최대 5개
                if isinstance(value, (str, int, float)):
                    message_parts.append(f"- {key}: {value}")
        
        enhanced_message = "\n".join(message_parts)
        
        if can_answer:
            return {
                "agent_type": "general_qa_agent",
                "response": {
                    "type": "general_qa",
                    "message": enhanced_message,
                    "details": details
                },
                "analysis_steps": result.get('analysis_steps', 1),
                "confidence": result.get('confidence', 'medium'),
                "progress_messages": result.get('progress_messages', [])  # 진행 상황 메시지 추가
            }
        else:
            suggestion = final_result.get('suggestion', '프로젝트 진행도, Task 제안, Task 완료 확인 등의 기능을 사용해주세요.')
            enhanced_message = f"{message_text}\n\n**추천 기능**: {suggestion}"
            
            return {
                "agent_type": "general_qa_agent",
                "response": {
                    "type": "general_qa",
                    "message": enhanced_message,
                    "suggestion": suggestion
                },
                "analysis_steps": result.get('analysis_steps', 1),
                "confidence": result.get('confidence', 'medium'),
                "progress_messages": result.get('progress_messages', [])  # 진행 상황 메시지 추가
            }
    except Exception as e:
        print(f"[Agent Router] 일반 질문 답변 agent 실행 실패: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "agent_type": "general_qa_agent",
            "error": f"일반 질문 답변 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "질문에 답변하는 중 오류가 발생했습니다."
            }
        }

def execute_task_assignment_agent(context, call_llm_func, user_message=None):
    """Task 할당 추천 agent 실행 (다단계 분석)"""
    if not user_message:
        return {
            "agent_type": "task_assignment_agent",
            "error": "사용자 메시지가 필요합니다.",
            "response": {
                "type": "error",
                "message": "Task 할당 추천을 위해 질문을 입력해주세요."
            }
        }
    
    # Task 정보 추출 (context에서 또는 user_message에서)
    task_title = context.get('taskTitle', '')
    task_description = context.get('taskDescription', '')
    project_members_with_tags = context.get('projectMembersWithTags', [])
    tasks = context.get('tasks', [])
    
    # user_message에서 Task 정보 추출 시도
    if not task_title and user_message and tasks:
        user_message_lower = user_message.lower()
        for task in tasks[:10]:
            task_title_lower = task.get('title', '').lower()
            if task_title_lower and task_title_lower in user_message_lower:
                task_title = task.get('title', '')
                task_description = task.get('description', '')
                break
        
        if not task_title and tasks:
            recent_task = tasks[0]
            task_title = recent_task.get('title', '')
            task_description = recent_task.get('description', '')
    
    if not project_members_with_tags:
        return {
            "agent_type": "task_assignment_agent",
            "error": "프로젝트 멤버 정보가 필요합니다.",
            "response": {
                "type": "error",
                "message": "프로젝트 멤버 정보가 없어 Task 할당 추천을 할 수 없습니다."
            }
        }
    
    try:
        result = execute_multi_step_agent(
            agent_type="task_assignment_agent",
            context=context,
            call_llm_func=call_llm_func,
            user_message=user_message,
            initial_prompt_func=create_task_assignment_initial_prompt,
            followup_prompt_func=create_task_assignment_followup_prompt,
            system_prompt="프로젝트 관리 전문가. Task 내용을 분석하여 적합한 담당자를 추천합니다. 반드시 한국어로만 응답. JSON만 응답."
        )
        
        # 결과 처리
        final_result = result.get('response', {})
        if not isinstance(final_result, dict):
            # 마지막 단계 결과 사용
            all_steps = result.get('all_steps', [])
            if all_steps:
                final_result = all_steps[-1]
            else:
                final_result = {}
        
        recommended_user_id = final_result.get('recommendedUserId')
        reason = final_result.get('reason', '')
        confidence = final_result.get('confidence', 'medium')
        alternative_users = final_result.get('alternativeUsers', [])
        required_skills = final_result.get('requiredSkills', [])
        user_match_score = final_result.get('matchScore', 0)
        
        confidence_kr = {
            'high': '높음',
            'medium': '보통',
            'low': '낮음'
        }.get(confidence, confidence)
        
        # 상세 메시지 구성
        message_parts = []
        
        if recommended_user_id:
            # 추천된 사용자 정보 찾기
            recommended_user = next(
                (m for m in project_members_with_tags if m.get('userId') == recommended_user_id),
                None
            )
            user_name = recommended_user.get('nickname', 'Unknown') if recommended_user else 'Unknown'
            user_tags = recommended_user.get('tags', []) if recommended_user else []
            
            message_parts.append(f"👤 **추천 담당자: {user_name}님**")
            message_parts.append(f"")
            message_parts.append(f"**Task**: {task_title}")
            if task_description:
                message_parts.append(f"**설명**: {task_description[:200]}")
            message_parts.append(f"")
            message_parts.append(f"**추천 이유**:")
            message_parts.append(f"{reason}")
            
            if user_match_score > 0:
                message_parts.append(f"")
                message_parts.append(f"**적합도 점수**: {user_match_score}/100")
            
            if user_tags:
                message_parts.append(f"")
                message_parts.append(f"**담당자 보유 기술**: {', '.join(user_tags)}")
            
            if required_skills:
                message_parts.append(f"")
                message_parts.append(f"**Task 필요 기술**: {', '.join(required_skills)}")
            
            message_parts.append(f"")
            message_parts.append(f"**신뢰도**: {confidence_kr}")
            
            if alternative_users:
                message_parts.append(f"")
                message_parts.append(f"**대안 담당자**:")
                for i, alt_user in enumerate(alternative_users[:3], 1):  # 최대 3개
                    alt_user_info = next(
                        (m for m in project_members_with_tags if m.get('userId') == alt_user.get('userId')),
                        None
                    )
                    if alt_user_info:
                        alt_name = alt_user_info.get('nickname', 'Unknown')
                        alt_reason = alt_user.get('reason', '')
                        message_parts.append(f"{i}. {alt_name}님 - {alt_reason}")
        else:
            message_parts.append(f"⚠️ **적합한 담당자를 찾을 수 없습니다**")
            message_parts.append(f"")
            message_parts.append(f"**Task**: {task_title}")
            if task_description:
                message_parts.append(f"**설명**: {task_description[:200]}")
            message_parts.append(f"")
            message_parts.append(f"**이유**: {reason}")
            
            if required_skills:
                message_parts.append(f"")
                message_parts.append(f"**Task 필요 기술**: {', '.join(required_skills)}")
                message_parts.append(f"")
                message_parts.append(f"**제안**: 프로젝트 멤버에게 필요한 기술을 추가하거나, 외부 인력을 고려해보세요.")
        
        message = "\n".join(message_parts)
        
        return {
            "agent_type": "task_assignment_agent",
            "response": {
                "type": "task_assignment",
                "recommendedUserId": recommended_user_id,
                "reason": reason,
                "confidence": confidence,
                "message": message
            },
            "analysis_steps": result.get('analysis_steps', 1),
            "confidence": result.get('confidence', 'medium'),
            "progress_messages": result.get('progress_messages', [])  # 진행 상황 메시지 추가
        }
    except Exception as e:
        print(f"[Agent Router] Task 할당 추천 agent 실행 실패: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "agent_type": "task_assignment_agent",
            "error": f"Task 할당 추천 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "Task 할당 추천 중 오류가 발생했습니다."
            }
        }

