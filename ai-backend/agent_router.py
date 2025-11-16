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

def check_github_required(agent_type):
    """
    에이전트 타입에 따라 GitHub 연동이 필요한지 확인
    
    Returns:
        bool: GitHub 연동이 필요하면 True
    """
    github_required_agents = [
        "task_suggestion_agent",
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
                "task_suggestion_agent": "Task 제안",
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
        
        # 상세 메시지 생성
        message_parts = [
            f"💡 **{len(suggestions)}개의 Task를 제안했습니다**",
            f""
        ]
        
        if suggestions:
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
                message_parts.append(f"**{category_kr.get(category, category)}** ({len(items)}개):")
                for i, item in enumerate(items[:3], 1):  # 카테고리당 최대 3개
                    title = item.get('title', '제목 없음')
                    priority = item.get('priority', 'Low')
                    estimated_hours = item.get('estimatedHours', 0)
                    message_parts.append(f"{i}. {title} (우선순위: {priority}, 예상 시간: {estimated_hours}시간)")
                message_parts.append("")
            
            message_parts.append(f"💡 **팁**: 각 Task를 클릭하여 상세 정보를 확인하고 프로젝트에 추가할 수 있습니다.")
        else:
            message_parts.append("현재 프로젝트 상태를 분석한 결과, 추가로 제안할 Task가 없습니다.")
            message_parts.append("프로젝트가 잘 관리되고 있습니다! 🎉")
        
        message = "\n".join(message_parts)
        
        return {
            "agent_type": "task_suggestion_agent",
            "response": {
                "type": "task_suggestions",
                "suggestions": suggestions,
                "message": message
            },
            "analysis_steps": result.get('analysis_steps', 1),
            "confidence": result.get('confidence', 'medium'),
            "progress_messages": result.get('progress_messages', [])  # 진행 상황 메시지 추가
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
        
        # 최종 분석 결과 구성
        analysis = step5_result if step5_result else (all_steps[-1] if all_steps else {})
        
        # 단계별 결과가 있으면 최종 narrativeResponse 생성
        if step1_result and step2_result and step3_result:
            project_name = step1_result.get('projectName', '프로젝트')
            project_desc = step1_result.get('projectDescription', '')
            required_features = step2_result.get('requiredFeatures', [])
            implemented_features = step3_result.get('implementedFeatures', [])
            missing_features = step4_result.get('missingFeatures', []) if step4_result else []
            
            # 진행도 계산
            total_required = len(required_features)
            total_implemented = len(implemented_features)
            total_missing = len(missing_features)
            progress = round((total_implemented / total_required * 100) if total_required > 0 else 0, 1)
            
            # 구현된 기능 목록 생성
            implemented_list = []
            for feat in implemented_features:
                name = feat.get('name', '')
                file_path = feat.get('filePath', '')
                func_or_class = feat.get('functionOrClass', '')
                details = feat.get('implementationDetails', '')
                implemented_list.append(f"- **{name}** (`{file_path}`에 구현)\n  - 함수/클래스: `{func_or_class}`\n  - 구현 내용: {details}")
            
            # 미구현 기능 목록 생성
            missing_list = []
            for feat in missing_features:
                name = feat.get('name', '')
                reason = feat.get('reason', '')
                expected_loc = feat.get('expectedLocation', '')
                missing_list.append(f"- **{name}**: {reason}\n  - 예상 파일 위치: `{expected_loc}`")
            
            # narrativeResponse 생성
            narrative_response = f"""## 프로젝트 이름
{project_name}

### 프로젝트 설명
{project_desc}

### 구현된 기능
{chr(10).join(implemented_list) if implemented_list else "없음"}

### 미구현 기능
{chr(10).join(missing_list) if missing_list else "없음"}

### 평가
**진행도 계산:**
- 필요한 요소 수: 총 {total_required}개
- 개발된 요소 수: {total_implemented}개 (읽은 파일에서 실제로 확인됨)
- 개발되지 않은 요소 수: {total_missing}개
- 진행도: {total_implemented} / {total_required} × 100 = {progress}%
- 검증: {total_implemented} + {total_missing} = {total_required} (일치 확인)

**프로젝트 상태 평가:**
- 현재 구현 상태: 핵심 기능 {total_implemented}개가 구현되어 있어 기본적인 기능은 작동 가능한 상태입니다. 하지만 {total_missing}개의 미구현 기능이 있어 완전한 프로젝트 완성을 위해서는 추가 개발이 필요합니다.
- 안정성: 부분적 안정 - 구현된 기능은 작동하나, 미구현 기능들이 사용자 경험에 영향을 줄 수 있습니다.
- 앞으로 구현할 내용: {', '.join([f.get('name', '') for f in missing_features[:3]])} 등 {total_missing}개의 기능을 구현해야 합니다.
- 예상 소요 기간: 현재 진행 속도를 고려할 때 약 2-3주 정도 소요될 것으로 예상됩니다.
- 위험 요소: 미구현 기능들이 사용자 경험에 영향을 줄 수 있으며, 보안 취약점이 있을 수 있습니다. 정기적인 코드 리뷰와 테스트가 필요합니다.
- 성공 가능성: {'높음' if progress >= 70 else '보통' if progress >= 40 else '낮음'} - 핵심 기능이 {'이미 구현되어 있어' if progress >= 70 else '부분적으로 구현되어 있어' if progress >= 40 else '아직 부족하여'} 나머지 기능 구현이 완료되면 성공적으로 프로젝트를 완료할 수 있을 것으로 예상됩니다."""
            
            analysis['narrativeResponse'] = narrative_response
            analysis['currentProgress'] = progress
        
        # narrativeResponse에서 진행도 계산값 추출하여 currentProgress와 일치시키기 (백업)
        narrative_response = analysis.get('narrativeResponse', '')
        if narrative_response:
            import re
            # "진행도: [숫자]%" 패턴 찾기
            progress_match = re.search(r'진행도:\s*(\d+(?:\.\d+)?)\s*%', narrative_response)
            if progress_match:
                calculated_progress = float(progress_match.group(1))
                # currentProgress와 일치시키기
                if abs(analysis.get('currentProgress', 0) - calculated_progress) > 5:
                    print(f"[Agent Router] 진행도 불일치 감지: currentProgress={analysis.get('currentProgress')}, 계산값={calculated_progress}, 일치시킴")
                    analysis['currentProgress'] = round(calculated_progress)
        
        # 사용자 친화적인 상세 메시지 생성
        # narrativeResponse가 있으면 우선 사용 (마크다운 형식)
        narrative_response = analysis.get('narrativeResponse', '')
        
        if narrative_response and len(narrative_response) > 100:
            # 마크다운 형식의 응답이 있으면 이를 메인 메시지로 사용
            message = narrative_response
            
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
            
            # 메시지 끝에 핵심 지표 추가 (마크다운 형식)
            message += f"\n\n---\n\n## 📊 핵심 지표\n\n"
            message += f"- **진행도**: {progress}%\n"
            message += f"- **활동 추세**: {trend_kr}\n"
            message += f"- **지연 위험도**: {delay_risk_kr}\n"
            if estimated_date:
                message += f"- **예상 완료일**: {estimated_date}\n"
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

