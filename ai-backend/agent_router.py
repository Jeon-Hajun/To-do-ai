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

def execute_task_suggestion_agent(context, call_llm_func, user_message=None):
    """Task 제안 agent 실행 (다단계 분석)"""
    try:
        result = execute_multi_step_agent(
            agent_type="task_suggestion_agent",
            context=context,
            call_llm_func=call_llm_func,
            user_message=user_message,
            initial_prompt_func=create_task_suggestion_initial_prompt,
            followup_prompt_func=create_task_suggestion_followup_prompt,
            system_prompt="소프트웨어 엔지니어링 전문가. 코드 분석 후 Task 제안. 반드시 한국어로 응답. JSON만 응답."
        )
        
        # 결과 처리
        final_result = result.get('response', {})
        if isinstance(final_result, dict) and 'suggestions' in final_result:
            suggestions = final_result['suggestions']
        elif isinstance(final_result, list):
            suggestions = final_result
        else:
            # 마지막 단계 결과에서 suggestions 추출 시도
            all_steps = result.get('all_steps', [])
            if all_steps:
                last_step = all_steps[-1]
                if isinstance(last_step, list):
                    suggestions = last_step
                elif isinstance(last_step, dict) and 'suggestions' in last_step:
                    suggestions = last_step['suggestions']
                else:
                    suggestions = []
            else:
                suggestions = []
        
        if not isinstance(suggestions, list):
            suggestions = [suggestions] if suggestions else []
        
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
            },
            "analysis_steps": result.get('analysis_steps', 1),
            "confidence": result.get('confidence', 'medium')
        }
    except Exception as e:
        print(f"[Agent Router] Task 제안 agent 실행 실패: {e}")
        import traceback
        print(traceback.format_exc())
        return {
            "agent_type": "task_suggestion_agent",
            "error": f"Task 제안 생성 실패: {str(e)}",
            "response": {
                "type": "error",
                "message": "Task 제안을 생성하는 중 오류가 발생했습니다."
            }
        }

def execute_progress_analysis_agent(context, call_llm_func, user_message=None):
    """진행도 분석 agent 실행 (다단계 분석)"""
    try:
        result = execute_multi_step_agent(
            agent_type="progress_analysis_agent",
            context=context,
            call_llm_func=call_llm_func,
            user_message=user_message,
            initial_prompt_func=create_progress_analysis_initial_prompt,
            followup_prompt_func=create_progress_analysis_followup_prompt,
            system_prompt="프로젝트 관리 전문가. 진행도 분석 및 예측. 반드시 한국어로 응답. JSON만 응답."
        )
        
        # 결과 처리
        analysis = result.get('response', {})
        if not isinstance(analysis, dict):
            # 마지막 단계 결과 사용
            all_steps = result.get('all_steps', [])
            if all_steps:
                analysis = all_steps[-1]
            else:
                analysis = {}
        
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
            },
            "analysis_steps": result.get('analysis_steps', 1),
            "confidence": result.get('confidence', 'medium')
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
        
        # 사용자 친화적인 메시지 생성
        is_completed = final_result.get('isCompleted', False)
        completion_pct = final_result.get('completionPercentage', 0)
        confidence = final_result.get('confidence', 'low')
        
        if is_completed:
            message = f"Task가 완료되었습니다. 완성도: {completion_pct}% (신뢰도: {confidence})"
        else:
            message = f"Task가 아직 완료되지 않았습니다. 완성도: {completion_pct}% (신뢰도: {confidence})"
        
        return {
            "agent_type": "task_completion_agent",
            "response": {
                "type": "task_completion",
                "result": final_result,
                "message": message
            },
            "analysis_steps": result.get('analysis_steps', 1),
            "confidence": result.get('confidence', 'low')
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
        
        if can_answer:
            return {
                "agent_type": "general_qa_agent",
                "response": {
                    "type": "general_qa",
                    "message": final_result.get('message', ''),
                    "details": final_result.get('details', {})
                },
                "analysis_steps": result.get('analysis_steps', 1),
                "confidence": result.get('confidence', 'medium')
            }
        else:
            return {
                "agent_type": "general_qa_agent",
                "response": {
                    "type": "general_qa",
                    "message": final_result.get('message', '죄송하지만 그 정보는 제공할 수 없습니다.'),
                    "suggestion": final_result.get('suggestion', '프로젝트 진행도, Task 제안, Task 완료 확인 등의 기능을 사용해주세요.')
                },
                "analysis_steps": result.get('analysis_steps', 1),
                "confidence": result.get('confidence', 'medium')
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
            },
            "analysis_steps": result.get('analysis_steps', 1),
            "confidence": result.get('confidence', 'medium')
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

