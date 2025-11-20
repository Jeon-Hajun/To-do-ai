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

def process_chat_message(user_message, conversation_history, context, call_llm_func):
    """
    사용자 메시지를 분석하여 적절한 agent를 선택하고 실행합니다.
    (의도 분류 + 라우팅 통합)
    
    Args:
        user_message: 사용자 메시지
        conversation_history: 대화 히스토리 리스트
        context: agent 실행에 필요한 컨텍스트
        call_llm_func: LLM 호출 함수 (prompt, system_prompt) -> content
    
    Returns:
        dict: {
            "agent_type": "task_suggestion_agent|progress_analysis_agent|task_completion_agent|general_qa_agent",
            "confidence": "high|medium|low",
            "reason": "...",
            "intent_classification": {...},
            "response": {...},
            ...
        }
    """
    # 프로젝트 컨텍스트 요약 정보 준비
    project_context_summary = {
        'projectDescription': context.get('projectDescription', ''),
        'commits': context.get('commits', [])[:10],  # 최근 10개만
        'tasks': context.get('tasks', [])[:10],  # 최근 10개만
        'issues': context.get('issues', [])[:10]  # 최근 10개만
    }
    
    # 1. 의도 분류
    print('[Agent Router] 의도 분류 시작')
    prompt = create_intent_classification_prompt(user_message, conversation_history, project_context_summary)
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
        
        intent_result = json.loads(content)
        
        # 기본값 설정
        if 'agent_type' not in intent_result:
            intent_result['agent_type'] = 'general_qa_agent'
        if 'confidence' not in intent_result:
            intent_result['confidence'] = 'medium'
        
        agent_type = intent_result.get('agent_type', 'general_qa_agent')
        confidence = intent_result.get('confidence', 'medium')
        
        print(f'[Agent Router] 선택된 agent: {agent_type}, 신뢰도: {confidence}')
        
    except Exception as e:
        print(f"[Agent Router] 의도 분류 실패: {e}")
        # 기본값 사용
        agent_type = 'general_qa_agent'
        confidence = 'low'
        intent_result = {
            "agent_type": agent_type,
            "confidence": confidence,
            "reason": f"의도 분류 실패: {str(e)}",
            "extracted_info": {}
        }
    
    # 2. GitHub 연동 필요 여부 확인
    if check_github_required(agent_type):
        github_repo = context.get('githubRepo', '') or context.get('github_repo', '')
        if not github_repo or github_repo.strip() == '':
            agent_name = {
                "progress_analysis_agent": "진행도 분석",
                "task_completion_agent": "Task 완료 확인"
            }.get(agent_type, "이 기능")
            
            return {
                "agent_type": agent_type,
                "confidence": confidence,
                "intent_classification": intent_result,
                "error": "GITHUB_REQUIRED",
                "response": {
                    "type": "error",
                    "message": f"{agent_name} 기능을 사용하려면 GitHub 저장소가 연결되어 있어야 합니다. 프로젝트 설정에서 GitHub 저장소를 연결해주세요."
                }
            }
    
    # 3. Agent 실행
    print(f'[Agent Router] {agent_type} 실행 시작')
    agent_result = None
    
    if agent_type == "task_suggestion_agent":
        agent_result = execute_task_suggestion_agent(context, call_llm_func, user_message)
    elif agent_type == "progress_analysis_agent":
        agent_result = execute_progress_analysis_agent(context, call_llm_func, user_message)
    elif agent_type == "task_completion_agent":
        agent_result = execute_task_completion_agent(context, call_llm_func, user_message)
    elif agent_type == "task_assignment_agent":
        # 일괄 할당 요청인지 확인
        if user_message:
            user_message_lower = user_message.lower()
            batch_keywords = ['모든', '전체', '일괄', '한번에', '모두', 'all', 'batch', 'bulk']
            task_keywords = ['task', '작업', '할일', '태스크']
            assign_keywords = ['할당', 'assign', '배정']
            
            is_batch_request = (
                any(keyword in user_message_lower for keyword in batch_keywords) and
                any(keyword in user_message_lower for keyword in task_keywords) and
                any(keyword in user_message_lower for keyword in assign_keywords)
            )
            
            if is_batch_request:
                print(f"[Agent Router] 일괄 Task 할당 요청 감지: {user_message}")
                agent_result = execute_batch_task_assignment_agent(context, call_llm_func, user_message)
            else:
                agent_result = execute_task_assignment_agent(context, call_llm_func, user_message)
        else:
            agent_result = execute_task_assignment_agent(context, call_llm_func, user_message)
    elif agent_type == "batch_task_assignment_agent":
        agent_result = execute_batch_task_assignment_agent(context, call_llm_func, user_message)
    elif agent_type == "general_qa_agent":
        agent_result = execute_general_qa_agent(context, call_llm_func, user_message)
    else:
        agent_result = {
            "error": f"알 수 없는 agent 타입: {agent_type}",
            "agent_type": agent_type
        }
    
    # 4. 결과 통합
    result = {
        "agent_type": agent_type,
        "confidence": confidence,
        "intent_classification": intent_result,
    }
    
    # agent_result의 모든 필드를 결과에 추가
    if agent_result:
        result.update(agent_result)
    
    return result

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
        import time
        agent_start_time = time.time()
        
        project_name = context.get('projectName', '프로젝트')
        github_repo = context.get('githubRepo', '')
        github_token = context.get('githubToken')
        has_github = github_repo and github_repo.strip() != ''
        
        # GitHub 토큰 확인 로그
        print(f"[Agent Router] Task 제안 - GitHub 저장소: {github_repo if has_github else '없음'}")
        print(f"[Agent Router] Task 제안 - GitHub 토큰: {'있음' if github_token else '없음'}")
        if github_token:
            print(f"[Agent Router] Task 제안 - GitHub 토큰 길이: {len(github_token)}, 시작: {github_token[:10]}...")
        else:
            print(f"[Agent Router] Task 제안 - ⚠️ GitHub 토큰 없음 - rate limit 제한 가능성 (시간당 60회)")
        
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
            step1_readme_start = time.time()
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
            step1_readme_elapsed = time.time() - step1_readme_start
            print(f"[Agent Router] Task 제안 - 1단계 README 읽기 소요 시간: {step1_readme_elapsed:.2f}초")
        else:
            print(f"[Agent Router] Task 제안 - 1단계 README 읽기 건너뜀 (GitHub 미연결)")
        
        # 1단계 프롬프트 생성 및 LLM 호출
        step1_llm_start = time.time()
        prompt_step1 = create_task_suggestion_step1_prompt(context, user_message, read_files_step1, [], 1)
        system_prompt = "소프트웨어 프로젝트 분석 전문가. 반드시 한국어로 응답. JSON만 응답."
        response_step1 = call_llm_func(prompt_step1, system_prompt)
        step1_llm_elapsed = time.time() - step1_llm_start
        print(f"[Agent Router] Task 제안 - 1단계 LLM 호출 소요 시간: {step1_llm_elapsed:.2f}초")
        
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
        step2_start_time = time.time()
        
        # 소스코드 파일 읽기 (GitHub 연결 시) - 논리적 읽기 방식
        read_files_step2 = []
        if has_github:
            # 주요 디렉토리 탐색 (파일 목록만 수집)
            project_structure = step1_result.get('projectInfo', {}).get('projectStructure', {})
            main_directories = project_structure.get('mainDirectories', [])
            
            # mainDirectories가 비어있으면 기본 디렉토리 목록 사용
            if not main_directories:
                main_directories = ["src", "app", "components", "pages", "routes", "controllers", "services", "utils", "backend", "frontend"]
            
            # 디렉토리에서 파일 목록만 수집 (파일 내용은 읽지 않음)
            all_files_list = []
            progress_messages.append("🔍 프로젝트 파일 목록 수집 중...")
            dir_collection_start = time.time()
            
            # 디렉토리 탐색 개수 제한 및 병렬 처리
            from concurrent.futures import ThreadPoolExecutor, as_completed
            
            def collect_dir_files(dir_path):
                """단일 디렉토리에서 파일 수집"""
                try:
                    dir_files = list_directory_contents(github_repo, github_token, dir_path)
                    # JavaScript/TypeScript/Python 파일 선택
                    code_files = [f for f in dir_files if f.endswith(('.js', '.jsx', '.ts', '.tsx', '.py'))]
                    return code_files
                except Exception as e:
                    print(f"[Agent Router] 디렉토리 탐색 실패 ({dir_path}): {e}")
                    return []
            
            # 병렬로 디렉토리 탐색 (최대 3개 동시)
            directories_to_scan = main_directories[:3]  # 최대 3개 디렉토리만 (속도 향상)
            if directories_to_scan:
                with ThreadPoolExecutor(max_workers=3) as executor:
                    future_to_dir = {executor.submit(collect_dir_files, dir_path): dir_path 
                                   for dir_path in directories_to_scan}
                    for future in as_completed(future_to_dir):
                        code_files = future.result()
                        all_files_list.extend(code_files)
                        if len(all_files_list) >= 50:  # 최대 50개로 제한 (속도 향상)
                            break
            
            dir_collection_elapsed = time.time() - dir_collection_start
            print(f"[Agent Router] Task 제안 - 2단계에서 {len(all_files_list)}개 파일 목록 수집 (소요 시간: {dir_collection_elapsed:.2f}초)")
            
            # LLM에게 파일 목록 제공하여 필요한 파일만 선택 요청
            if all_files_list:
                progress_messages.append("🤔 필요한 파일 선택 중...")
                file_selection_start = time.time()
                from prompt_functions import create_task_suggestion_file_selection_prompt
                file_selection_prompt = create_task_suggestion_file_selection_prompt(
                    context, user_message, all_files_list, step1_result
                )
                file_selection_response = call_llm_func(file_selection_prompt, system_prompt)
                file_selection_elapsed = time.time() - file_selection_start
                print(f"[Agent Router] Task 제안 - 파일 선택 LLM 호출 소요 시간: {file_selection_elapsed:.2f}초")
                
                # JSON 파싱
                try:
                    if '```json' in file_selection_response:
                        file_selection_response = file_selection_response.split('```json')[1].split('```')[0].strip()
                    elif '```' in file_selection_response:
                        file_selection_response = file_selection_response.split('```')[1].split('```')[0].strip()
                    
                    file_selection_response = file_selection_response.strip()
                    if '{' in file_selection_response:
                        file_selection_response = file_selection_response[file_selection_response.find('{'):]
                    if '}' in file_selection_response:
                        file_selection_response = file_selection_response[:file_selection_response.rfind('}')+1]
                    
                    file_selection_result = json.loads(file_selection_response)
                    selected_files = file_selection_result.get('selectedFiles', [])
                    selection_reason = file_selection_result.get('reason', '')
                    
                    print(f"[Agent Router] Task 제안 - LLM이 {len(selected_files)}개 파일 선택: {selection_reason}")
                    progress_messages.append(f"✅ {len(selected_files)}개 파일 선택됨")
                    
                    # 선택된 파일만 읽기
                    if selected_files:
                        progress_messages.append(f"📄 선택된 파일 읽는 중... ({len(selected_files)}개)")
                        file_contents = get_file_contents(github_repo, github_token, selected_files[:15], max_lines_per_file=500)  # 최대 15개로 제한
                        read_files_step2 = [
                            {
                                "path": f.get('filePath', ''),
                                "content": f.get('content', ''),
                                "truncated": f.get('truncated', False)
                            }
                            for f in file_contents if f.get('content')
                        ]
                        print(f"[Agent Router] Task 제안 - 2단계에서 {len(read_files_step2)}개 파일 읽음 (논리적 선택)")
                        progress_messages.append(f"✅ {len(read_files_step2)}개 파일 읽기 완료")
                    else:
                        print(f"[Agent Router] Task 제안 - LLM이 파일을 선택하지 않음")
                        progress_messages.append("⚠️ 파일 선택 실패, 기본 파일 읽기 시도")
                        # 폴백: 처음 10개 파일만 읽기
                        if all_files_list:
                            file_contents = get_file_contents(github_repo, github_token, all_files_list[:10], max_lines_per_file=500)
                            read_files_step2 = [
                                {
                                    "path": f.get('filePath', ''),
                                    "content": f.get('content', ''),
                                    "truncated": f.get('truncated', False)
                                }
                                for f in file_contents if f.get('content')
                            ]
                            print(f"[Agent Router] Task 제안 - 2단계에서 폴백으로 {len(read_files_step2)}개 파일 읽음")
                except Exception as e:
                    print(f"[Agent Router] 파일 선택 파싱 실패: {e}")
                    # 폴백: 처음 10개 파일만 읽기
                    if all_files_list:
                        file_contents = get_file_contents(github_repo, github_token, all_files_list[:10], max_lines_per_file=500)
                        read_files_step2 = [
                            {
                                "path": f.get('filePath', ''),
                                "content": f.get('content', ''),
                                "truncated": f.get('truncated', False)
                            }
                            for f in file_contents if f.get('content')
                        ]
                        print(f"[Agent Router] Task 제안 - 2단계에서 폴백으로 {len(read_files_step2)}개 파일 읽음")
        
        step2_file_read_elapsed = time.time() - step2_start_time
        print(f"[Agent Router] Task 제안 - 2단계 파일 읽기 소요 시간: {step2_file_read_elapsed:.2f}초")
        
        # 2단계 프롬프트 생성 및 LLM 호출
        step2_llm_start = time.time()
        prompt_step2 = create_task_suggestion_step2_prompt(context, user_message, read_files_step2, [], 2, step1_result)
        response_step2 = call_llm_func(prompt_step2, system_prompt)
        step2_llm_elapsed = time.time() - step2_llm_start
        print(f"[Agent Router] Task 제안 - 2단계 LLM 호출 소요 시간: {step2_llm_elapsed:.2f}초")
        
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
        
        # feature 카테고리 Task에 tags가 없으면 기본 태그 추가
        for suggestion in suggestions:
            if suggestion.get('category') == 'feature' and not suggestion.get('tags'):
                # Task 제목과 설명을 기반으로 태그 추론
                title = suggestion.get('title', '').lower()
                description = suggestion.get('description', '').lower()
                location = suggestion.get('location', '').lower()
                
                tags = []
                # 프론트엔드 키워드
                if any(keyword in title + description + location for keyword in 
                       ['ui', '페이지', '컴포넌트', 'frontend', 'react', 'vue', 'jsx', 'tsx', 'component', 'page']):
                    tags.append('frontend')
                # 백엔드 키워드
                if any(keyword in title + description + location for keyword in 
                       ['api', '서버', 'backend', 'controller', 'route', 'endpoint', '서비스', 'service']):
                    tags.append('backend')
                # 데이터베이스 키워드
                if any(keyword in title + description + location for keyword in 
                       ['db', 'database', '데이터베이스', '스키마', 'schema', 'migration', '쿼리', 'query']):
                    tags.append('db')
                # 테스트 키워드
                if any(keyword in title + description + location for keyword in 
                       ['test', '테스트', 'testing', 'unit', 'integration', 'e2e']):
                    tags.append('test')
                
                # 태그가 없으면 기본값으로 frontend 또는 backend 추가
                if not tags:
                    # location이나 description에 힌트가 있으면 그걸로 판단
                    if any(keyword in location for keyword in ['src/', 'components/', 'pages/', 'frontend/']):
                        tags.append('frontend')
                    elif any(keyword in location for keyword in ['backend/', 'controllers/', 'routes/', 'api/']):
                        tags.append('backend')
                    else:
                        # 기본값으로 frontend와 backend 둘 다 추가 (안전하게)
                        tags = ['frontend', 'backend']
                
                suggestion['tags'] = tags
                print(f"[Agent Router] Task 제안 - feature Task에 tags 추가: {suggestion.get('title')} → {tags}")
        
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
        
        agent_total_elapsed = time.time() - agent_start_time
        print(f"[Agent Router] Task 제안 - {len(suggestions)}개 제안 생성 완료, 총 소요 시간: {agent_total_elapsed:.2f}초")
        
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
    import re
    
    # Task 정보 추출 (task_assignment_agent와 동일한 로직)
    task = context.get('task')  # 직접 전달된 task 객체
    task_title = context.get('taskTitle', '')
    task_description = context.get('taskDescription', '')
    task_id = context.get('taskId')
    tasks = context.get('tasks', []) or context.get('currentTasks', [])
    
    # 1. context에서 직접 Task 객체 가져오기 (우선순위 1)
    if not task and task_id and tasks:
        for t in tasks:
            if t.get('id') == task_id or str(t.get('id')) == str(task_id):
                task = t
                task_title = t.get('title', '')
                task_description = t.get('description', '')
                print(f"[Agent Router] Task 완료 확인 - Task ID {task_id}로 Task 찾음: {task_title}")
                break
    
    # 2. taskTitle로 Task 찾기 (우선순위 2)
    if not task and task_title and tasks:
        for t in tasks:
            if t.get('title', '').lower() == task_title.lower():
                task = t
                task_description = t.get('description', '')
                print(f"[Agent Router] Task 완료 확인 - Task 제목으로 찾음: {task_title}")
                break
    
    # 3. user_message에서 Task ID 추출 시도 (우선순위 3) - 명확한 ID만 처리
    if not task and user_message and tasks:
        # Task ID 패턴 (예: "Task 123", "#123", "id: 123")
        task_id_patterns = [
            r'(?:task|작업|할일)\s*[#:]?\s*(\d+)',
            r'#(\d+)',
            r'id[:\s]+(\d+)'
        ]
        for pattern in task_id_patterns:
            match = re.search(pattern, user_message, re.IGNORECASE)
            if match:
                found_id = int(match.group(1))
                for t in tasks:
                    if t.get('id') == found_id or str(t.get('id')) == str(found_id):
                        task = t
                        task_title = t.get('title', '')
                        task_description = t.get('description', '')
                        print(f"[Agent Router] Task 완료 확인 - 메시지에서 Task ID {found_id} 추출: {task_title}")
                        break
                if task:
                    break
    
    # Task를 찾지 못한 경우 - LLM에게 task list를 주고 매칭되는 task를 찾도록 함
    if not task:
        if not tasks or len(tasks) == 0:
            return {
                "agent_type": "task_completion_agent",
                "error": "Task 정보가 필요합니다.",
                "response": {
                    "type": "error",
                    "message": "프로젝트에 Task가 없습니다."
                }
            }
        
        # LLM에게 task list와 사용자 메시지를 주고 매칭되는 task를 찾도록 요청
        task_list_text = "다음은 프로젝트의 Task 목록입니다:\n\n"
        for idx, t in enumerate(tasks[:30], 1):  # 최대 30개까지 표시
            task_status = t.get('status', 'todo')
            status_kr = {
                'todo': '대기',
                'in_progress': '진행중',
                'done': '완료'
            }.get(task_status, task_status)
            task_list_text += f"{idx}. [ID: {t.get('id', 'N/A')}] {t.get('title', '제목 없음')} (상태: {status_kr})\n"
            if t.get('description'):
                task_list_text += f"   설명: {t.get('description', '')[:100]}\n"
        
        prompt = f"""사용자가 Task 완료 확인을 요청했습니다. 다음 Task 목록에서 사용자 메시지와 매칭되는 Task를 찾아주세요.

{task_list_text}

사용자 메시지: "{user_message}"

위 Task 목록을 검토하고, 사용자 메시지와 가장 관련이 있는 Task를 찾아주세요.
- Task ID를 명시한 경우 해당 ID의 Task를 선택하세요.
- Task 제목이나 설명과 관련이 있는 Task를 선택하세요.
- 여러 Task가 매칭될 수 있다면 모두 나열하세요.

다음 JSON 형식으로 응답하세요:
{{
    "matched_task_ids": [1, 2, 3],  // 매칭된 Task ID 목록
    "reason": "매칭 이유 설명",
    "task_count": 2  // 매칭된 Task 개수
}}

매칭된 Task가 없으면:
{{
    "matched_task_ids": [],
    "reason": "매칭되는 Task를 찾을 수 없습니다.",
    "task_count": 0
}}"""

        system_prompt = "Task 매칭 전문가. 사용자 메시지와 Task 목록을 비교하여 관련된 Task를 찾습니다. 반드시 한국어로만 응답. JSON만 응답."
        
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
            
            match_result = json.loads(content)
            matched_task_ids = match_result.get('matched_task_ids', [])
            task_count = match_result.get('task_count', 0)
            reason = match_result.get('reason', '')
            
            if task_count == 0:
                return {
                    "agent_type": "task_completion_agent",
                    "response": {
                        "type": "needs_more_info",
                        "message": f"사용자 메시지와 매칭되는 Task를 찾을 수 없습니다.\n\n{task_list_text}\n\nTask ID나 제목을 명확히 지정해주세요."
                    }
                }
            elif task_count == 1:
                # 단일 매칭인 경우 해당 task 선택
                matched_id = matched_task_ids[0]
                for t in tasks:
                    if t.get('id') == matched_id or str(t.get('id')) == str(matched_id):
                        task = t
                        task_title = t.get('title', '')
                        task_description = t.get('description', '')
                        print(f"[Agent Router] Task 완료 확인 - LLM이 Task ID {matched_id} 선택: {task_title}")
                        break
            else:
                # 여러 task가 매칭된 경우 사용자에게 선택지 제공
                matched_task_list = []
                for matched_id in matched_task_ids[:10]:  # 최대 10개만 표시
                    for t in tasks:
                        if t.get('id') == matched_id or str(t.get('id')) == str(matched_id):
                            matched_task_list.append(t)
                            break
                
                task_list = []
                for idx, t in enumerate(matched_task_list, 1):
                    task_list.append(f"{idx}. {t.get('title', '제목 없음')} (ID: {t.get('id', 'N/A')})")
                
                message_parts = [
                    f"다음 {len(matched_task_list)}개의 Task가 매칭되었습니다:",
                    "",
                ]
                message_parts.extend(task_list)
                message_parts.extend([
                    "",
                    "확인하고 싶은 Task의 번호를 선택하거나, Task ID를 명시해주세요.",
                    "예: '1번 task 완료 확인' 또는 'Task 123 완료 확인'"
                ])
                
                return {
                    "agent_type": "task_completion_agent",
                    "response": {
                        "type": "needs_more_info",
                        "message": "\n".join(message_parts),
                        "matched_tasks": [{"id": t.get('id'), "title": t.get('title', '')} for t in matched_task_list]
                    }
                }
        
        except Exception as e:
            print(f"[Agent Router] Task 완료 확인 - LLM 매칭 실패: {e}")
            return {
                "agent_type": "task_completion_agent",
                "error": "Task 매칭 실패",
                "response": {
                    "type": "error",
                    "message": f"Task를 찾는 중 오류가 발생했습니다. Task ID를 명시해주세요. 예: 'Task 123 완료 확인'"
                }
            }
    
    # Task를 찾지 못한 경우 (LLM 매칭 후에도 task가 없는 경우)
    if not task:
        return {
            "agent_type": "task_completion_agent",
            "error": "Task 정보가 필요합니다.",
            "response": {
                "type": "error",
                "message": "Task를 찾을 수 없습니다. Task ID를 명시해주세요. 예: 'Task 123 완료 확인'"
            }
        }
    
    # task 객체를 context에 추가
    context['task'] = task
    
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
        
        # 전체 task 확인 여부 확인 (context에 여러 task가 있는 경우 간단하게 출력)
        tasks_count = len(context.get('tasks', []) or context.get('currentTasks', []))
        is_batch_check = tasks_count > 1 and user_message and any(keyword in user_message.lower() for keyword in ['전체', '모든', 'all', '모두', '일괄'])
        
        # 상세 메시지 구성
        message_parts = []
        
        if is_batch_check:
            # 전체 task 확인 시 간단하게 출력 (1줄 미만)
            if is_completed:
                message_parts.append(f"✅ **{task.get('title', '제목 없음')}**: 완료됨 ({completion_pct}%)")
            else:
                message_parts.append(f"⏳ **{task.get('title', '제목 없음')}**: 진행 중 ({completion_pct}%)")
        else:
            # 기본 task 완료 확인 - 상세 정보 표시
            # 1. Task 정보 먼저 표시
            task_status = task.get('status', 'todo')
            status_kr = {
                'todo': '대기',
                'in_progress': '진행중',
                'done': '완료'
            }.get(task_status, task_status)
            
            message_parts.append(f"## 📋 Task 정보")
            message_parts.append(f"")
            message_parts.append(f"**제목**: {task.get('title', '제목 없음')}")
            message_parts.append(f"")
            if task.get('description'):
                message_parts.append(f"**설명**: {task.get('description', '')}")
                message_parts.append(f"")
            message_parts.append(f"**현재 상태**: {status_kr} ({task_status})")
            message_parts.append(f"")
            message_parts.append(f"**Task ID**: {task.get('id', 'N/A')}")
            message_parts.append(f"")
            message_parts.append(f"---")
            message_parts.append(f"")
            
            # 2. 완료 상태 표시
            if is_completed:
                message_parts.append(f"✅ **Task 완료 상태: 완료됨**")
            else:
                message_parts.append(f"⏳ **Task 완료 상태: 진행 중**")
            
            message_parts.append(f"")
            message_parts.append(f"**완성도**: {completion_pct}%")
            message_parts.append(f"**신뢰도**: {confidence_kr}")
            message_parts.append(f"")
            
            # 3. 완료 근거 및 설명
            if evidence:
                message_parts.append(f"**✅ 완료 근거**:")
                for i, ev in enumerate(evidence[:5], 1):  # 최대 5개
                    message_parts.append(f"{i}. {ev}")
                message_parts.append(f"")
            
            if related_commits:
                message_parts.append(f"**📝 관련 커밋**: {len(related_commits)}개 발견")
                for commit in related_commits[:3]:  # 최대 3개
                    commit_msg = commit.get('message', '')[:80]
                    message_parts.append(f"- {commit_msg}")
                message_parts.append(f"")
            
            # 4. 부족한 부분 검증
            if missing_requirements:
                message_parts.append(f"**⚠️ 부족한 요구사항 (검증 결과)**:")
                for i, req in enumerate(missing_requirements[:5], 1):  # 최대 5개
                    message_parts.append(f"{i}. {req}")
                message_parts.append(f"")
            elif not is_completed and completion_pct < 100:
                # 완료되지 않았지만 missing_requirements가 없는 경우
                message_parts.append(f"**⚠️ 검증 결과**:")
                message_parts.append(f"- Task가 완전히 완료되지 않았습니다. (완성도: {completion_pct}%)")
                message_parts.append(f"- 추가 작업이 필요할 수 있습니다.")
                message_parts.append(f"")
            
            # 5. 개선 제안
            if recommendations:
                message_parts.append(f"**💡 개선 제안**:")
                for i, rec in enumerate(recommendations[:5], 1):  # 최대 5개
                    message_parts.append(f"{i}. {rec}")
                message_parts.append(f"")
        
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
    """Task 할당 추천 agent 실행 (개선된 버전)"""
    import re
    
    # Task 정보 추출 (개선된 로직)
    task_title = context.get('taskTitle', '')
    task_description = context.get('taskDescription', '')
    task_id = context.get('taskId')
    task_tags = context.get('taskTags', [])  # Task의 tags (frontend/backend/db/test)
    project_members_with_tags = context.get('projectMembersWithTags', [])
    tasks = context.get('tasks', []) or context.get('currentTasks', [])
    unassigned_tasks = context.get('unassignedTasks', [])  # 미할당 Task 목록
    
    # 디버깅: 전체 context 정보 로그
    print(f"[Agent Router] Task 할당 - Context 정보:")
    print(f"  - taskTitle: {task_title}")
    print(f"  - taskDescription: {task_description}")
    print(f"  - taskId: {task_id}")
    print(f"  - taskTags: {task_tags}")
    print(f"  - tasks 리스트 길이: {len(tasks) if tasks else 0}")
    print(f"  - user_message: {user_message[:100] if user_message else 'None'}")
    if tasks:
        print(f"  - tasks 샘플 (최대 3개): {[(t.get('id'), t.get('title', '')[:30]) for t in tasks[:3]]}")
    
    # 디버깅: 멤버 정보 로그
    print(f"[Agent Router] Task 할당 - 프로젝트 멤버 수: {len(project_members_with_tags) if project_members_with_tags else 0}")
    if project_members_with_tags:
        print(f"[Agent Router] Task 할당 - 멤버 목록: {[m.get('nickname', 'Unknown') for m in project_members_with_tags]}")
    
    # 1. context에서 직접 Task 정보 가져오기 (우선순위 1)
    if not task_title and task_id and tasks:
        for task in tasks:
            if task.get('id') == task_id or str(task.get('id')) == str(task_id):
                task_title = task.get('title', '')
                task_description = task.get('description', '')
                task_tags = task.get('tags', []) or task_tags
                break
    
    # 2. user_message에서 Task ID 추출 시도 (우선순위 2)
    if not task_title and user_message:
        # "Task 123", "작업 123", "#123" 등의 패턴 찾기
        task_id_patterns = [
            r'(?:task|작업|할일)\s*[#:]?\s*(\d+)',
            r'#(\d+)',
            r'id[:\s]+(\d+)'
        ]
        for pattern in task_id_patterns:
            match = re.search(pattern, user_message, re.IGNORECASE)
            if match:
                found_id = int(match.group(1))
                for task in tasks:
                    if task.get('id') == found_id or str(task.get('id')) == str(found_id):
                        task_title = task.get('title', '')
                        task_description = task.get('description', '')
                        task_tags = task.get('tags', []) or task_tags
                        print(f"[Agent Router] Task 할당 - Task ID {found_id}로 Task 찾음: {task_title}")
                        break
                if task_title:
                    break
    
    # 3. user_message에서 Task 제목 추출 시도 (우선순위 3)
    if not task_title and user_message and tasks:
        user_message_lower = user_message.lower()
        # 가장 긴 매칭을 찾기 위해 길이순 정렬
        matched_tasks = []
        for task in tasks[:20]:  # 최대 20개까지 확인
            task_title_lower = task.get('title', '').lower()
            if task_title_lower and task_title_lower in user_message_lower:
                matched_tasks.append((len(task_title_lower), task))
        
        if matched_tasks:
            # 가장 긴 매칭 선택 (더 정확함)
            matched_tasks.sort(reverse=True, key=lambda x: x[0])
            task_title = matched_tasks[0][1].get('title', '')
            task_description = matched_tasks[0][1].get('description', '')
            task_tags = matched_tasks[0][1].get('tags', []) or task_tags
            print(f"[Agent Router] Task 할당 - 메시지에서 Task 제목 매칭: {task_title}")
    
    # 4. 미할당 Task 자동 선택 (우선순위 4)
    if not task_title and unassigned_tasks:
        # 미할당 Task 중 최근 생성된 것 선택 (createdAt 기준, 없으면 첫 번째)
        unassigned_sorted = sorted(
            unassigned_tasks,
            key=lambda t: t.get('createdAt', '') or t.get('created_at', ''),
            reverse=True
        )
        selected_task = unassigned_sorted[0]
        task_title = selected_task.get('title', '')
        task_description = selected_task.get('description', '')
        task_tags = selected_task.get('tags', []) or task_tags
        task_id = selected_task.get('id') or task_id
        print(f"[Agent Router] Task 할당 - 미할당 Task 자동 선택: {task_title} (ID: {task_id})")
    
    # 5. 최근 Task 사용 (우선순위 5, 마지막 수단)
    if not task_title and tasks:
        recent_task = tasks[0]
        task_title = recent_task.get('title', '')
        task_description = recent_task.get('description', '')
        task_tags = recent_task.get('tags', []) or task_tags
        print(f"[Agent Router] Task 할당 - 최근 Task 사용: {task_title}")
    
    # Task 정보가 없으면 에러
    if not task_title:
        print(f"[Agent Router] Task 할당 - ⚠️ Task 정보를 찾을 수 없음")
        print(f"  - task_title: {task_title}")
        print(f"  - tasks 리스트: {len(tasks) if tasks else 0}개")
        print(f"  - unassigned_tasks 리스트: {len(unassigned_tasks) if unassigned_tasks else 0}개")
        print(f"  - user_message: {user_message}")
        
        # 사용자 친화적인 에러 메시지 생성
        total_tasks = len(tasks) if tasks else 0
        unassigned_count = len(unassigned_tasks) if unassigned_tasks else 0
        
        if total_tasks == 0:
            error_message = "프로젝트에 Task가 없습니다. 먼저 Task를 생성해주세요."
        elif unassigned_count == 0:
            error_message = f"모든 Task가 이미 할당되어 있습니다. (총 {total_tasks}개 Task)"
        else:
            error_message = f"Task 정보를 찾을 수 없습니다. 프로젝트에 Task가 {total_tasks}개 있고, 그 중 {unassigned_count}개가 미할당 상태입니다. Task 제목이나 ID를 명시해주세요. (예: 'Task 1을 할당해줘', '로그인 기능을 누구에게 할당할까?')"
        
        return {
            "agent_type": "task_assignment_agent",
            "error": "Task 정보가 필요합니다.",
            "response": {
                "type": "error",
                "message": error_message
            }
        }
    
    # 프로젝트 멤버 검증
    print(f"[Agent Router] Task 할당 - 멤버 검증: project_members_with_tags={project_members_with_tags}, type={type(project_members_with_tags)}")
    if not project_members_with_tags:
        print(f"[Agent Router] Task 할당 - ⚠️ project_members_with_tags가 None 또는 빈 값")
        return {
            "agent_type": "task_assignment_agent",
            "error": "프로젝트 멤버 정보가 필요합니다.",
            "response": {
                "type": "error",
                "message": "프로젝트 멤버 정보가 없어 Task 할당 추천을 할 수 없습니다. 프로젝트에 멤버를 추가해주세요."
            }
        }
    
    if len(project_members_with_tags) == 0:
        print(f"[Agent Router] Task 할당 - ⚠️ project_members_with_tags가 빈 배열")
        return {
            "agent_type": "task_assignment_agent",
            "error": "프로젝트 멤버 정보가 필요합니다.",
            "response": {
                "type": "error",
                "message": "프로젝트에 멤버가 없습니다. 프로젝트에 멤버를 추가한 후 다시 시도해주세요."
            }
        }
    
    # 멤버가 1명만 있으면 할당 추천이 의미 없음
    if len(project_members_with_tags) == 1:
        single_member = project_members_with_tags[0]
        return {
            "agent_type": "task_assignment_agent",
            "response": {
                "type": "task_assignment",
                "recommendedUserId": single_member.get('userId'),
                "reason": f"프로젝트에 멤버가 1명뿐이므로 {single_member.get('nickname', 'Unknown')}님에게 할당하는 것을 추천합니다.",
                "confidence": "high",
                "message": f"👤 **추천 담당자: {single_member.get('nickname', 'Unknown')}님**\n\n프로젝트에 멤버가 1명뿐이므로 자동으로 할당됩니다.\n\n**Task**: {task_title}"
            },
            "analysis_steps": 0,
            "confidence": "high",
            "progress_messages": []
        }
    
    # Task tags를 context에 추가
    context['taskTitle'] = task_title
    context['taskDescription'] = task_description
    context['taskTags'] = task_tags
    print(f"[Agent Router] Task 할당 - Task 정보: {task_title}, Tags: {task_tags}")
    
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
            if task_tags:
                message_parts.append(f"**Task 태그**: {', '.join(task_tags)}")
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
            
            # 태그 매칭 정보 표시
            if task_tags and user_tags:
                matched_tags = []
                tag_mapping = {
                    'frontend': ['프론트엔드', 'Frontend', 'React', 'Vue', 'UI', '프론트', '웹', '클라이언트'],
                    'backend': ['백엔드', 'Backend', '서버', 'API', 'Node.js', 'Express', '서버사이드'],
                    'db': ['데이터베이스', 'Database', 'DB', 'MySQL', 'PostgreSQL', 'MongoDB', 'SQL'],
                    'test': ['테스트', 'Test', 'QA', '테스터', '품질보증']
                }
                for task_tag in task_tags:
                    for user_tag in user_tags:
                        user_tag_lower = user_tag.lower()
                        if task_tag.lower() in user_tag_lower or any(mapped in user_tag for mapped in tag_mapping.get(task_tag.lower(), [])):
                            matched_tags.append(f"{task_tag} ↔ {user_tag}")
                
                if matched_tags:
                    message_parts.append(f"")
                    message_parts.append(f"**태그 매칭**: {', '.join(matched_tags)}")
            
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

def execute_batch_task_assignment_agent(context, call_llm_func, user_message=None):
    """여러 Task를 한번에 할당 추천하는 agent 실행"""
    import json
    
    project_members_with_tags = context.get('projectMembersWithTags', [])
    unassigned_tasks = context.get('unassignedTasks', [])
    tasks = context.get('tasks', []) or context.get('currentTasks', [])
    
    print(f"[Agent Router] 일괄 Task 할당 - 미할당 Task 수: {len(unassigned_tasks) if unassigned_tasks else 0}")
    print(f"[Agent Router] 일괄 Task 할당 - 프로젝트 멤버 수: {len(project_members_with_tags) if project_members_with_tags else 0}")
    
    # 미할당 Task가 없으면 에러
    if not unassigned_tasks or len(unassigned_tasks) == 0:
        return {
            "agent_type": "batch_task_assignment_agent",
            "error": "미할당 Task가 없습니다.",
            "response": {
                "type": "error",
                "message": "할당할 미할당 Task가 없습니다."
            }
        }
    
    # 프로젝트 멤버 검증
    if not project_members_with_tags or len(project_members_with_tags) == 0:
        return {
            "agent_type": "batch_task_assignment_agent",
            "error": "프로젝트 멤버 정보가 필요합니다.",
            "response": {
                "type": "error",
                "message": "프로젝트 멤버 정보가 없어 Task 할당 추천을 할 수 없습니다."
            }
        }
    
    # 멤버가 1명만 있으면 모든 Task를 그 멤버에게 할당
    if len(project_members_with_tags) == 1:
        single_member = project_members_with_tags[0]
        recommendations = []
        for task in unassigned_tasks:
            recommendations.append({
                "taskId": task.get('id'),
                "taskTitle": task.get('title', ''),
                "recommendedUserId": single_member.get('userId'),
                "reason": f"프로젝트에 멤버가 1명뿐이므로 {single_member.get('nickname', 'Unknown')}님에게 할당합니다.",
                "confidence": "high",
                "matchScore": 100
            })
        
        return {
            "agent_type": "batch_task_assignment_agent",
            "response": {
                "type": "batch_task_assignment",
                "recommendations": recommendations,
                "totalTasks": len(unassigned_tasks),
                "message": f"프로젝트에 멤버가 1명뿐이므로 모든 미할당 Task({len(unassigned_tasks)}개)를 {single_member.get('nickname', 'Unknown')}님에게 할당합니다."
            }
        }
    
    # 여러 Task에 대해 각각 추천 수행
    recommendations = []
    errors = []
    
    for task in unassigned_tasks:
        task_id = task.get('id')
        task_title = task.get('title', '')
        task_description = task.get('description', '')
        task_tags = task.get('tags', [])
        
        print(f"[Agent Router] 일괄 Task 할당 - Task 처리 중: {task_title} (ID: {task_id})")
        
        try:
            # 개별 Task에 대한 context 생성
            task_context = context.copy()
            task_context['taskTitle'] = task_title
            task_context['taskDescription'] = task_description
            task_context['taskTags'] = task_tags
            task_context['taskId'] = task_id
            
            # 개별 Task 할당 추천 수행
            result = execute_task_assignment_agent(
                context=task_context,
                call_llm_func=call_llm_func,
                user_message=None
            )
            
            if result.get('error'):
                errors.append({
                    "taskId": task_id,
                    "taskTitle": task_title,
                    "error": result.get('error')
                })
                continue
            
            response = result.get('response', {})
            if response.get('type') == 'task_assignment':
                recommendations.append({
                    "taskId": task_id,
                    "taskTitle": task_title,
                    "recommendedUserId": response.get('recommendedUserId'),
                    "reason": response.get('reason', ''),
                    "confidence": response.get('confidence', 'medium'),
                    "matchScore": response.get('matchScore', 0),
                    "requiredSkills": response.get('requiredSkills', []),
                    "alternativeUsers": response.get('alternativeUsers', [])
                })
            else:
                errors.append({
                    "taskId": task_id,
                    "taskTitle": task_title,
                    "error": "추천 결과를 받을 수 없습니다."
                })
        except Exception as e:
            print(f"[Agent Router] 일괄 Task 할당 - Task {task_id} 처리 실패: {e}")
            errors.append({
                "taskId": task_id,
                "taskTitle": task_title,
                "error": str(e)
            })
    
    # 결과 메시지 생성
    message_parts = []
    message_parts.append(f"📋 **일괄 Task 할당 추천 완료**")
    message_parts.append(f"")
    message_parts.append(f"**처리된 Task**: {len(recommendations)}개")
    if errors:
        message_parts.append(f"**실패한 Task**: {len(errors)}개")
    
    if recommendations:
        message_parts.append(f"")
        message_parts.append(f"**추천 결과**:")
        for i, rec in enumerate(recommendations, 1):
            recommended_user = next(
                (m for m in project_members_with_tags if m.get('userId') == rec.get('recommendedUserId')),
                None
            )
            user_name = recommended_user.get('nickname', 'Unknown') if recommended_user else 'Unknown'
            message_parts.append(f"{i}. **{rec.get('taskTitle', 'Unknown')}** → {user_name}님")
    
    message = "\n".join(message_parts)
    
    return {
        "agent_type": "batch_task_assignment_agent",
        "response": {
            "type": "batch_task_assignment",
            "recommendations": recommendations,
            "errors": errors,
            "totalTasks": len(unassigned_tasks),
            "successCount": len(recommendations),
            "errorCount": len(errors),
            "message": message
        }
    }

