"""
Agent 라우터 시스템
사용자 질의를 분석하여 적절한 AI agent를 선택하고 실행합니다.
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
    
    if agent_type == "task_suggestion_agent":
        return execute_task_suggestion_agent(context, call_llm_func)
    elif agent_type == "progress_analysis_agent":
        return execute_progress_analysis_agent(context, call_llm_func)
    elif agent_type == "task_completion_agent":
        return execute_task_completion_agent(context, call_llm_func)
    elif agent_type == "task_assignment_agent":
        return execute_task_assignment_agent(context, call_llm_func, user_message)
    elif agent_type == "general_qa_agent":
        return execute_general_qa_agent(context, call_llm_func, user_message)
    else:
        return {
            "error": f"알 수 없는 agent 타입: {agent_type}",
            "agent_type": agent_type
        }

def execute_task_suggestion_agent(context, call_llm_func):
    """Task 제안 agent 실행"""
    commits = context.get('commits', [])
    issues = context.get('issues', [])
    currentTasks = context.get('currentTasks', [])
    projectDescription = context.get('projectDescription', '')
    githubRepo = context.get('githubRepo', '')
    
    prompt = create_optimized_task_suggestion_prompt(
        commits, issues, currentTasks, projectDescription, githubRepo
    )
    system_prompt = "소프트웨어 엔지니어링 전문가. 코드 분석 후 Task 제안. 반드시 한국어로 응답. JSON만 응답."
    
    try:
        content = call_llm_func(prompt, system_prompt)
        
        # JSON 파싱
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        suggestions = json.loads(content)
        if not isinstance(suggestions, list):
            suggestions = [suggestions]
        
        # 카테고리별 정렬
        category_order = {'security': 0, 'refactor': 1, 'feature': 2, 'performance': 3, 'maintenance': 4}
        suggestions.sort(key=lambda x: (
            category_order.get(x.get('category', 'maintenance'), 99),
            {'High': 0, 'Medium': 1, 'Low': 2}.get(x.get('priority', 'Low'), 2)
        ))
        
        return {
            "agent_type": "task_suggestion_agent",
            "response": {
                "type": "task_suggestions",
                "suggestions": suggestions,
                "message": f"{len(suggestions)}개의 Task를 제안했습니다."
            }
        }
    except Exception as e:
        print(f"[Agent Router] Task 제안 agent 실행 실패: {e}")
        return {
            "agent_type": "task_suggestion_agent",
            "error": f"Task 제안 생성 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "Task 제안을 생성하는 중 오류가 발생했습니다."
            }
        }

def execute_progress_analysis_agent(context, call_llm_func):
    """진행도 분석 agent 실행"""
    commits = context.get('commits', [])
    tasks = context.get('tasks', [])
    projectDescription = context.get('projectDescription', '')
    projectStartDate = context.get('projectStartDate', None)
    projectDueDate = context.get('projectDueDate', None)
    
    prompt = create_optimized_progress_prompt(
        commits, tasks, projectDescription, projectStartDate, projectDueDate
    )
    system_prompt = "프로젝트 관리 전문가. 진행도 분석 및 예측. 반드시 한국어로 응답. JSON만 응답."
    
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
        
        analysis = json.loads(content)
        
        # 사용자 친화적인 메시지 생성
        progress = analysis.get('currentProgress', 0)
        trend = analysis.get('activityTrend', 'stable')
        trend_kr = {
            'increasing': '증가 중',
            'stable': '안정적',
            'decreasing': '감소 중'
        }.get(trend, trend)
        
        message = f"현재 진행도는 {progress}%이며, 활동 추세는 {trend_kr}입니다."
        
        return {
            "agent_type": "progress_analysis_agent",
            "response": {
                "type": "progress_analysis",
                "analysis": analysis,
                "message": message
            }
        }
    except Exception as e:
        print(f"[Agent Router] 진행도 분석 agent 실행 실패: {e}")
        return {
            "agent_type": "progress_analysis_agent",
            "error": f"진행도 분석 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "진행도 분석 중 오류가 발생했습니다."
            }
        }

def execute_task_completion_agent(context, call_llm_func):
    """Task 완료 확인 agent 실행"""
    task = context.get('task')
    commits = context.get('commits', [])
    projectDescription = context.get('projectDescription', '')
    
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
        # 1차 분석
        initial_prompt = create_initial_completion_prompt(task, commits, projectDescription)
        initial_content = call_llm_func(initial_prompt, system_prompt)
        
        # JSON 파싱
        if '```json' in initial_content:
            initial_content = initial_content.split('```json')[1].split('```')[0].strip()
        elif '```' in initial_content:
            initial_content = initial_content.split('```')[1].split('```')[0].strip()
        
        initial_content = initial_content.strip()
        if '{' in initial_content:
            initial_content = initial_content[initial_content.find('{'):]
        if '}' in initial_content:
            initial_content = initial_content[:initial_content.rfind('}')+1]
        
        initial_result = json.loads(initial_content)
        
        # 추가 정보가 필요한 경우 2차 분석
        if initial_result.get("needsMoreInfo", False):
            followup_prompt = create_followup_completion_prompt(task, initial_result, commits, projectDescription)
            followup_content = call_llm_func(followup_prompt, system_prompt)
            
            # JSON 파싱
            if '```json' in followup_content:
                followup_content = followup_content.split('```json')[1].split('```')[0].strip()
            elif '```' in followup_content:
                followup_content = followup_content.split('```')[1].split('```')[0].strip()
            
            followup_content = followup_content.strip()
            if '{' in followup_content:
                followup_content = followup_content[followup_content.find('{'):]
            if '}' in followup_content:
                followup_content = followup_content[:followup_content.rfind('}')+1]
            
            final_result = json.loads(followup_content)
            final_result['initialAnalysis'] = initial_result
            final_result['analysisSteps'] = 2
            
            result = final_result
        else:
            initial_result['analysisSteps'] = 1
            result = initial_result
        
        # 사용자 친화적인 메시지 생성
        is_completed = result.get('isCompleted', False)
        completion_pct = result.get('completionPercentage', 0)
        confidence = result.get('confidence', 'low')
        
        if is_completed:
            message = f"Task가 완료되었습니다. 완성도: {completion_pct}% (신뢰도: {confidence})"
        else:
            message = f"Task가 아직 완료되지 않았습니다. 완성도: {completion_pct}% (신뢰도: {confidence})"
        
        return {
            "agent_type": "task_completion_agent",
            "response": {
                "type": "task_completion",
                "result": result,
                "message": message
            }
        }
    except Exception as e:
        print(f"[Agent Router] Task 완료 확인 agent 실행 실패: {e}")
        return {
            "agent_type": "task_completion_agent",
            "error": f"Task 완료 확인 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "Task 완료 확인 중 오류가 발생했습니다."
            }
        }

def execute_general_qa_agent(context, call_llm_func, user_message):
    """일반적인 질문 답변 agent 실행"""
    if not user_message:
        return {
            "agent_type": "general_qa_agent",
            "error": "사용자 메시지가 필요합니다.",
            "response": {
                "type": "error",
                "message": "질문을 입력해주세요."
            }
        }
    
    commits = context.get('commits', [])
    issues = context.get('issues', [])
    tasks = context.get('tasks', [])
    projectDescription = context.get('projectDescription', '')
    githubRepo = context.get('githubRepo', '')
    
    # 프로젝트 통계 계산
    task_stats = {
        'total': len(tasks),
        'todo': sum(1 for t in tasks if t.get('status') == 'todo'),
        'in_progress': sum(1 for t in tasks if t.get('status') == 'in_progress'),
        'done': sum(1 for t in tasks if t.get('status') == 'done')
    }
    
    commit_stats = {
        'total': len(commits),
        'total_lines_added': sum(c.get('linesAdded', 0) or 0 for c in commits),
        'total_lines_deleted': sum(c.get('linesDeleted', 0) or 0 for c in commits),
        'total_files_changed': sum(c.get('filesChanged', 0) or 0 for c in commits)
    }
    
    issue_stats = {
        'total': len(issues),
        'open': sum(1 for i in issues if i.get('state') == 'open'),
        'closed': sum(1 for i in issues if i.get('state') == 'closed')
    }
    
    # 최근 활동 분석
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    recent_commits = sum(1 for c in commits if c.get('date') and 
                        datetime.fromisoformat(c.get('date').replace('Z', '+00:00')) >= week_ago)
    
    prompt = f"""당신은 프로젝트 관리 AI 어시스턴트입니다. 사용자의 질문에 대해 프로젝트 정보를 바탕으로 친절하고 정확하게 답변하세요.

⚠️ 중요: 반드시 한국어로만 응답하세요.

## 사용자 질문
"{user_message}"

## 프로젝트 정보
프로젝트 설명: {projectDescription[:500] if projectDescription else '설명 없음'}
GitHub 저장소: {githubRepo if githubRepo else '연결되지 않음'}

## 프로젝트 통계
**Task (작업)**
- 전체: {task_stats['total']}개
- 대기 중: {task_stats['todo']}개
- 진행 중: {task_stats['in_progress']}개
- 완료: {task_stats['done']}개

**커밋**
- 전체: {commit_stats['total']}개
- 추가된 라인: {commit_stats['total_lines_added']:,}줄
- 삭제된 라인: {commit_stats['total_lines_deleted']:,}줄
- 변경된 파일: {commit_stats['total_files_changed']}개
- 최근 7일 커밋: {recent_commits}개

**이슈**
- 전체: {issue_stats['total']}개
- 열림: {issue_stats['open']}개
- 닫힘: {issue_stats['closed']}개

## 최근 커밋 (최대 5개)
{chr(10).join([f"- {c.get('message', '')[:80]} ({c.get('date', '')[:10] if c.get('date') else '날짜 없음'})" for c in commits[:5]]) if commits else "커밋 없음"}

## 최근 Task (최대 5개)
{chr(10).join([f"- {t.get('title', '')} ({t.get('status', 'unknown')})" for t in tasks[:5]]) if tasks else "Task 없음"}

## 답변 규칙
1. 제공된 프로젝트 정보와 통계를 활용하여 사용자 질문에 정확하게 답변하세요.
2. 질문이 프로젝트와 관련이 있고 위 정보로 답변할 수 있다면, 친절하고 상세하게 답변하세요.
3. 질문에 대한 답변을 할 수 없는 경우 (예: 프로젝트와 무관한 질문, 개인정보, 외부 정보 등), 정중하게 "죄송하지만 그 정보는 제공할 수 없습니다. 프로젝트 진행도, Task 제안, Task 완료 확인 등의 기능을 사용해주세요."라고 답변하세요.
4. 프로젝트에 대한 일반적인 질문(설명, 통계, 상태, 커밋 수, 작업 수 등)은 위 정보를 바탕으로 답변하세요.
5. 답변은 친절하고 자연스러운 한국어로 작성하세요.
6. 숫자는 쉼표를 사용하여 읽기 쉽게 표시하세요.
7. 가능한 한 구체적이고 유용한 정보를 제공하세요.

## 응답 형식
다음 JSON 형식으로만 응답하세요 (반드시 한국어로):
{{
  "can_answer": true 또는 false,
  "message": "사용자 질문에 대한 답변을 한국어로 작성 (친절하고 자연스럽게)",
  "details": {{
    "used_statistics": ["사용한 통계 정보"],
    "source": "정보 출처 (예: '프로젝트 통계', '커밋 데이터')"
  }}
}}

만약 답변할 수 없는 질문인 경우:
{{
  "can_answer": false,
  "message": "정중한 거부 메시지를 한국어로 작성",
  "suggestion": "대신 사용할 수 있는 기능 제안"
}}"""
    
    system_prompt = "프로젝트 관리 전문가. 프로젝트 정보를 바탕으로 사용자 질문에 친절하게 답변합니다. 반드시 한국어로만 응답. JSON만 응답."
    
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
        
        can_answer = result.get('can_answer', True)
        
        if can_answer:
            return {
                "agent_type": "general_qa_agent",
                "response": {
                    "type": "general_qa",
                    "message": result.get('message', ''),
                    "details": result.get('details', {})
                }
            }
        else:
            return {
                "agent_type": "general_qa_agent",
                "response": {
                    "type": "general_qa",
                    "message": result.get('message', '죄송하지만 그 정보는 제공할 수 없습니다.'),
                    "suggestion": result.get('suggestion', '프로젝트 진행도, Task 제안, Task 완료 확인 등의 기능을 사용해주세요.')
                }
            }
    except Exception as e:
        print(f"[Agent Router] 일반 질문 답변 agent 실행 실패: {e}")
        return {
            "agent_type": "general_qa_agent",
            "error": f"일반 질문 답변 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "질문에 답변하는 중 오류가 발생했습니다."
            }
        }

def execute_task_assignment_agent(context, call_llm_func, user_message):
    """Task 할당 추천 agent 실행"""
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
        # 사용자 메시지에서 Task 제목을 찾기 시도
        # 예: "이 Task를 누구에게 할당하면 좋을까?" -> 최근 Task 사용
        # 또는 "로그인 기능을 누구에게 할당하면 좋을까?" -> 제목에 "로그인"이 포함된 Task 찾기
        user_message_lower = user_message.lower()
        for task in tasks[:10]:  # 최근 10개 Task만 확인
            task_title_lower = task.get('title', '').lower()
            if task_title_lower and task_title_lower in user_message_lower:
                task_title = task.get('title', '')
                task_description = task.get('description', '')
                break
        
        # 매칭되는 Task가 없으면 최근 Task 사용
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
    
    prompt = create_task_assignment_prompt(task_title, task_description, project_members_with_tags)
    system_prompt = "프로젝트 관리 전문가. Task 내용을 분석하여 적합한 담당자를 추천합니다. 반드시 한국어로만 응답. JSON만 응답."
    
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
        
        recommended_user_id = result.get('recommendedUserId')
        reason = result.get('reason', '')
        confidence = result.get('confidence', 'medium')
        
        if recommended_user_id:
            # 추천된 사용자 정보 찾기
            recommended_user = next(
                (m for m in project_members_with_tags if m.get('userId') == recommended_user_id),
                None
            )
            user_name = recommended_user.get('nickname', 'Unknown') if recommended_user else 'Unknown'
            
            message = f"'{task_title}' Task는 {user_name}님에게 할당하는 것을 추천합니다. 이유: {reason}"
        else:
            message = f"적합한 담당자를 찾을 수 없습니다. {reason}"
        
        return {
            "agent_type": "task_assignment_agent",
            "response": {
                "type": "task_assignment",
                "recommendedUserId": recommended_user_id,
                "reason": reason,
                "confidence": confidence,
                "message": message
            }
        }
    except Exception as e:
        print(f"[Agent Router] Task 할당 추천 agent 실행 실패: {e}")
        return {
            "agent_type": "task_assignment_agent",
            "error": f"Task 할당 추천 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "Task 할당 추천 중 오류가 발생했습니다."
            }
        }

