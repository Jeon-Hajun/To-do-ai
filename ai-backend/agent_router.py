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
    create_followup_completion_prompt
)

def classify_intent(user_message, conversation_history, call_llm_func):
    """
    사용자 질의의 의도를 분석하여 적절한 agent 타입을 반환합니다.
    
    Args:
        user_message: 사용자 메시지
        conversation_history: 대화 히스토리 리스트
        call_llm_func: LLM 호출 함수 (prompt, system_prompt) -> content
    
    Returns:
        dict: {
            "agent_type": "task_suggestion_agent|progress_analysis_agent|task_completion_agent",
            "confidence": "high|medium|low",
            "reason": "...",
            "extracted_info": {...}
        }
    """
    prompt = create_intent_classification_prompt(user_message, conversation_history)
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
            result['agent_type'] = 'progress_analysis_agent'
        if 'confidence' not in result:
            result['confidence'] = 'medium'
        
        return result
    except Exception as e:
        print(f"[Agent Router] 의도 분류 실패: {e}")
        # 기본값 반환
        return {
            "agent_type": "progress_analysis_agent",
            "confidence": "low",
            "reason": f"의도 분류 실패: {str(e)}",
            "extracted_info": {}
        }

def route_to_agent(agent_type, context, call_llm_func):
    """
    선택된 agent에 따라 적절한 프롬프트를 생성하고 실행합니다.
    
    Args:
        agent_type: agent 타입
        context: agent 실행에 필요한 컨텍스트
        call_llm_func: LLM 호출 함수
    
    Returns:
        dict: agent 실행 결과
    """
    
    if agent_type == "task_suggestion_agent":
        return execute_task_suggestion_agent(context, call_llm_func)
    elif agent_type == "progress_analysis_agent":
        return execute_progress_analysis_agent(context, call_llm_func)
    elif agent_type == "task_completion_agent":
        return execute_task_completion_agent(context, call_llm_func)
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

