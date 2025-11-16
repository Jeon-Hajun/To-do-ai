"""
프롬프트 최적화 유틸리티
프롬프트 길이를 줄이고 핵심 정보만 추출하여 리소스 소모를 감소시킵니다.
"""

import json

def summarize_commit_message(msg, max_length=80):
    """커밋 메시지를 요약합니다."""
    if len(msg) <= max_length:
        return msg
    
    # 첫 줄만 사용 (일반적으로 커밋 메시지의 핵심)
    first_line = msg.split('\n')[0]
    if len(first_line) <= max_length:
        return first_line
    
    # 길면 잘라서 ... 추가
    return first_line[:max_length-3] + "..."

def extract_keywords_from_commits(commits, max_commits=15):
    """커밋에서 핵심 키워드만 추출합니다."""
    keywords = []
    for commit in commits[:max_commits]:
        msg = commit.get('message', '')
        # 첫 줄만 사용하고 요약
        summarized = summarize_commit_message(msg, 60)
        keywords.append(f"{summarized} ({commit.get('linesAdded', 0)}+/{commit.get('linesDeleted', 0)}-)")
    return keywords

def summarize_file_paths(files, max_files=3):
    """파일 경로를 요약합니다."""
    if not files:
        return ""
    
    # 디렉토리별로 그룹화
    dirs = {}
    for file_path in files[:10]:  # 최대 10개만 확인
        parts = file_path.split('/')
        if len(parts) > 1:
            dir_name = '/'.join(parts[:-1])
            dirs[dir_name] = dirs.get(dir_name, 0) + 1
        else:
            dirs['root'] = dirs.get('root', 0) + 1
    
    # 상위 디렉토리만 반환
    top_dirs = sorted(dirs.items(), key=lambda x: x[1], reverse=True)[:max_files]
    return ', '.join([f"{d}({c}파일)" for d, c in top_dirs])

def create_optimized_task_suggestion_prompt(commits, issues, currentTasks, projectDescription, githubRepo):
    """최적화된 Task 제안 프롬프트 생성"""

    # 커밋 요약 (핵심만)
    commit_keywords = extract_keywords_from_commits(commits, max_commits=15)
    commit_summary = '\n'.join([f"- {kw}" for kw in commit_keywords])

    # 통계 계산
    totalLinesAdded = sum(c.get('linesAdded', 0) or 0 for c in commits[:30])
    totalLinesDeleted = sum(c.get('linesDeleted', 0) or 0 for c in commits[:30])

    # 파일 유형 통계
    fileTypes = {}
    for commit in commits[:30]:
        for file in commit.get('files', [])[:5]:
            ext = file.get('path', '').split('.')[-1] if '.' in file.get('path', '') else 'unknown'
            fileTypes[ext] = fileTypes.get(ext, 0) + 1
    topFileTypes = ', '.join([f"{ext}({count})" for ext, count in sorted(fileTypes.items(), key=lambda x: x[1], reverse=True)[:5]]) if fileTypes else "없음"

    # 이슈 요약
    openIssues = [i for i in issues if i.get('state') == 'open']
    issue_summary = f"{len(openIssues)}개 열림" if openIssues else "없음"

    # Task 요약
    task_summary = f"총 {len(currentTasks)}개 (todo: {sum(1 for t in currentTasks if t.get('status') == 'todo')}, 진행중: {sum(1 for t in currentTasks if t.get('status') == 'in_progress')}, 완료: {sum(1 for t in currentTasks if t.get('status') == 'done')})"

    # 최근 커밋 상세 정보
    recent_commits_detail = []
    for commit in commits[:15]:
        recent_commits_detail.append({
            "message": commit.get('message', '')[:150],
            "date": commit.get('date', ''),
            "files": [f.get('path', '') for f in commit.get('files', [])[:5]]
        })
    
    # 열린 이슈 상세 정보
    open_issues_detail = []
    for issue in openIssues[:10]:
        open_issues_detail.append({
            "title": issue.get('title', ''),
            "body": issue.get('body', '')[:200],
            "labels": issue.get('labels', [])
        })
    
    prompt = f"""프로젝트를 종합적으로 분석하여 **구체적이고 실용적인 Task**를 제안하세요.

## 프로젝트 정보:
- 프로젝트 설명: {projectDescription[:200]}
- GitHub 저장소: {githubRepo if githubRepo else '연결되지 않음'}

## 프로젝트 현황:
**커밋 활동**
- 총 커밋: {len(commits)}개
- 추가된 코드: {totalLinesAdded:,}줄
- 삭제된 코드: {totalLinesDeleted:,}줄
- 주요 파일 유형: {topFileTypes}

**이슈 현황**
- 열린 이슈: {len(openIssues)}개

**현재 작업(Task)**
- {task_summary}

## 최근 커밋 상세 (최근 {len(recent_commits_detail)}개):
{json.dumps(recent_commits_detail, ensure_ascii=False, indent=2)[:2000]}

## 열린 이슈 상세 (최근 {len(open_issues_detail)}개):
{json.dumps(open_issues_detail, ensure_ascii=False, indent=2)[:1500]}

## Task 제안 요청사항:
위 정보를 종합적으로 분석하여 **구체적이고 실용적인 Task**를 제안하세요.

각 Task는 다음을 포함해야 합니다:
1. **title**: 명확하고 구체적인 Task 제목 (예: "사용자 인증 시스템 구현" ❌, "JWT 기반 사용자 로그인 API 구현" ✅)
2. **description**: Task의 목적, 범위, 구현 방법 등을 **상세하게** 설명 (최소 3-5문장)
3. **category**: "feature" (기능 추가), "refactor" (리팩토링), "security" (보안), "performance" (성능), "maintenance" (유지보수)
4. **priority**: "High" (보안/심각한 기술부채만), "Medium" (중요한 개선), "Low" (선택적 개선)
5. **estimatedHours**: 예상 소요 시간 (숫자)
6. **reason**: 이 Task가 필요한 이유를 **구체적으로** 설명 (최소 2-3문장)

⚠️ 중요: 반드시 한국어로만 응답하고, JSON 배열 형식으로만 응답하세요.

다음 형식의 JSON 배열로 최대 5개 Task 제안:
[
  {{
    "title": "구체적인 Task 제목",
    "description": "상세한 설명 (최소 3-5문장)",
    "category": "feature|refactor|security|performance|maintenance",
    "priority": "High|Medium|Low",
    "estimatedHours": 숫자,
    "reason": "구체적인 이유 설명 (최소 2-3문장)"
  }}
]"""

    return prompt

def create_optimized_progress_prompt(commits, tasks, projectDescription, projectStartDate, projectDueDate):
    """최적화된 진행도 분석 프롬프트 생성"""

    # Task 통계
    taskStats = {
        'total': len(tasks),
        'todo': sum(1 for t in tasks if t.get('status') == 'todo'),
        'inProgress': sum(1 for t in tasks if t.get('status') == 'in_progress'),
        'done': sum(1 for t in tasks if t.get('status') == 'done')
    }

    # 커밋 통계
    commitStats = {
        'total': len(commits),
        'totalLinesAdded': sum(c.get('linesAdded', 0) or 0 for c in commits),
        'totalLinesDeleted': sum(c.get('linesDeleted', 0) or 0 for c in commits),
    }

    # 최근 활동 (간단히)
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    recent_week = sum(1 for c in commits if c.get('date') and
                     datetime.fromisoformat(c.get('date').replace('Z', '+00:00')) >= week_ago)
    
    # 커밋 상세 정보 추출
    commit_details = []
    for commit in commits[:20]:  # 최근 20개 커밋만
        commit_details.append({
            "message": commit.get('message', '')[:100],
            "date": commit.get('date', ''),
            "author": commit.get('author', ''),
            "linesAdded": commit.get('linesAdded', 0),
            "linesDeleted": commit.get('linesDeleted', 0)
        })
    
    # Task 상세 정보 추출
    task_details = []
    for task in tasks[:20]:  # 최근 20개 Task만
        task_details.append({
            "title": task.get('title', ''),
            "status": task.get('status', 'todo'),
            "dueDate": task.get('dueDate', ''),
            "assignedUserId": task.get('assignedUserId', '')
        })
    
    prompt = f"""프로젝트 진행도 분석을 수행하세요. 다음 데이터를 종합적으로 분석하여 상세하고 구체적인 분석 결과를 제공하세요.

## 프로젝트 정보:
- 프로젝트 설명: {projectDescription[:200]}
- 프로젝트 시작일: {projectStartDate or '미정'}
- 프로젝트 마감일: {projectDueDate or '미정'}

## 작업(Task) 현황:
- 총 작업 수: {taskStats['total']}개
- 완료: {taskStats['done']}개 ({taskStats['done']/taskStats['total']*100 if taskStats['total'] > 0 else 0:.1f}%)
- 진행 중: {taskStats['inProgress']}개 ({taskStats['inProgress']/taskStats['total']*100 if taskStats['total'] > 0 else 0:.1f}%)
- 대기 중: {taskStats['todo']}개 ({taskStats['todo']/taskStats['total']*100 if taskStats['total'] > 0 else 0:.1f}%)

## 커밋 활동 현황:
- 총 커밋 수: {commitStats['total']}개
- 추가된 코드 라인: {commitStats['totalLinesAdded']:,}줄
- 삭제된 코드 라인: {commitStats['totalLinesDeleted']:,}줄
- 최근 7일 커밋: {recent_week}개

## 최근 커밋 상세 (최근 {len(commit_details)}개):
{json.dumps(commit_details, ensure_ascii=False, indent=2)[:1500]}

## Task 상세 (최근 {len(task_details)}개):
{json.dumps(task_details, ensure_ascii=False, indent=2)[:1000]}

## 분석 요청사항:
다음 항목들을 **구체적이고 상세하게** 분석하여 JSON 형식으로 응답하세요. 특히 **narrativeResponse** 필드에는 GPT처럼 긴 문장 형태의 상세한 설명을 포함하세요.

1. **currentProgress (0-100)**: Task 완료율, 커밋 활동, 시간 경과 등을 종합하여 정확한 진행도 계산
2. **activityTrend**: 최근 활동 패턴을 분석하여 "increasing" (증가 중), "stable" (안정적), "decreasing" (감소 중) 중 하나 선택
3. **estimatedCompletionDate**: 현재 진행 속도를 바탕으로 예상 완료일 계산 (YYYY-MM-DD 형식 또는 null)
4. **delayRisk**: 마감일 대비 현재 진행 속도를 분석하여 "Low", "Medium", "High" 중 하나 선택
5. **insights**: 최소 3개 이상의 구체적인 인사이트 제공
6. **recommendations**: 최소 3개 이상의 구체적인 개선 제안 제공
7. **recentActivity**: 최근 활동 요약 (최근 7일, 30일 활동 패턴)
8. **keyMetrics**: 주요 지표 (평균 커밋 빈도, Task 완료 속도 등)
9. **narrativeResponse**: **매우 중요** - 다음 내용을 포함한 긴 문장 형태의 상세한 설명 (최소 500자 이상, GPT처럼 자연스럽고 상세하게):
   - **프로젝트 목표**: 이 프로젝트의 최종 목표와 비전을 설명
   - **현재 구현된 내용**: 지금까지 완료된 기능, 구현된 모듈, 달성한 마일스톤을 구체적으로 설명
   - **앞으로 구현할 내용**: 남은 작업, 계획된 기능, 향후 개발 방향을 상세히 설명
   - **예상 소요 기간**: 현재 진행 속도를 바탕으로 남은 작업 완료까지의 예상 기간과 일정
   - **프로젝트 상태 종합 평가**: 전체적인 프로젝트 상태, 위험 요소, 성공 가능성 등을 종합적으로 평가

⚠️ 중요: 
- 반드시 한국어로만 응답하고, JSON 형식으로만 응답하세요.
- **narrativeResponse** 필드는 단답형이 아닌 긴 문장 형태로 작성하세요 (최소 500자 이상).
- GPT처럼 자연스럽고 읽기 쉬운 문장으로 작성하세요.
- 각 항목을 구체적이고 상세하게 작성하세요.

다음 JSON 형식으로만 응답:
{{
  "currentProgress": 0-100,
  "activityTrend": "increasing|stable|decreasing",
  "estimatedCompletionDate": "YYYY-MM-DD 또는 null",
  "delayRisk": "Low|Medium|High",
  "insights": ["구체적인 인사이트 1", "구체적인 인사이트 2", "구체적인 인사이트 3"],
  "recommendations": ["구체적인 제안 1", "구체적인 제안 2", "구체적인 제안 3"],
  "recentActivity": {{
    "last7Days": "최근 7일 활동 요약",
    "last30Days": "최근 30일 활동 요약"
  }},
  "keyMetrics": {{
    "averageCommitsPerDay": 0.0,
    "taskCompletionRate": 0.0,
    "codeGrowthRate": "증가율 설명"
  }},
  "narrativeResponse": "프로젝트 목표, 현재 구현된 내용, 앞으로 구현할 내용, 예상 소요 기간 등을 포함한 긴 문장 형태의 상세한 설명 (최소 500자 이상)"
}}"""
    
    return prompt

def create_initial_completion_prompt(task, commits, projectDescription):
    """1차 분석 프롬프트 - 초기 평가 및 추가 탐색 필요성 판단"""
    
    task_status = task.get('status', 'todo')
    status_kr = {
        'todo': '대기',
        'in_progress': '진행중',
        'done': '완료'
    }.get(task_status, task_status)
    
    task_title = task.get('title', '')
    task_description = task.get('description', '') if task.get('description') else '(설명 없음)'
    
    # 커밋 요약 (간단히)
    commits_summary = []
    for commit in commits[:20]:
        msg = commit.get('message', '')[:80]
        files = commit.get('files', [])
        file_paths = ', '.join([f.get('path', '')[:30] for f in files[:3]])
        commits_summary.append(f"- {msg[:60]}... (파일: {file_paths[:50]})")
    
    commits_text = '\n'.join(commits_summary) if commits_summary else "커밋 없음"
    
    prompt = f"""당신은 Task 완료 여부를 단계적으로 분석하는 AI 에이전트입니다.

⚠️ 중요: 반드시 한국어로만 응답하세요.

## 분석 대상 Task
제목: {task_title}
설명: {task_description}
현재 상태: {status_kr} ({task_status})

## 1차 분석: 초기 평가 및 추가 탐색 필요성 판단

제공된 커밋 목록을 검토하고 다음을 판단하세요:

1. **Task 요구사항 파악**: Task 제목 "{task_title}"와 설명 "{task_description}"에서 요구하는 기능이 무엇인지 파악하세요.

2. **예상 구현 위치 추론**: 
   - 해당 기능이 어떤 파일/디렉토리에 구현되어 있을 것으로 예상되는지 추론하세요.
   - 예: "로그인 기능" → "auth 관련 파일", "API 엔드포인트" 등
   - 예: "GitHub 연동" → "github 관련 서비스 파일", "API 클라이언트" 등

3. **현재 커밋 분석**:
   - 제공된 커밋에서 Task와 관련된 코드 변경사항이 있는지 확인하세요.
   - 커밋 메시지는 참고만 하고, 실제 코드 변경사항(patch)을 중점적으로 확인하세요.

4. **추가 탐색 필요성 판단**:
   - 현재 정보로 Task 완료 여부를 확실히 판단할 수 있는가?
   - 더 많은 커밋이나 특정 파일의 코드 변경사항이 필요한가?
   - 어떤 정보가 더 필요한가?

## 제공된 커밋 목록
{commits_text}

## 응답 형식
다음 JSON 형식으로만 응답하세요 (반드시 한국어로):

**충분한 정보가 있을 때:**
{{
  "needsMoreInfo": false,
  "isCompleted": true 또는 false,
  "completionPercentage": 0-100,
  "confidence": "high|medium|low",
  "reason": "분석 결과를 한국어로 설명",
  "evidence": ["증거1", "증거2"],
  "recommendation": "추천사항"
}}

**추가 정보가 필요할 때:**
{{
  "needsMoreInfo": true,
  "expectedLocation": "예상되는 구현 위치 (예: 'backend/services/githubService.js', 'frontend/components/GitHub')",
  "searchStrategy": "추가 탐색 전략 (예: 'GitHub 관련 파일의 코드 변경사항 확인 필요', '인증 관련 커밋 추가 확인 필요')",
  "reason": "왜 추가 정보가 필요한지 한국어로 설명",
  "currentAnalysis": "현재까지의 분석 결과를 한국어로 설명"
}}"""
    
    return prompt

def create_followup_completion_prompt(task, initial_analysis, commits, projectDescription):
    """2차 분석 프롬프트 - 추가 탐색 후 최종 판단"""
    
    task_status = task.get('status', 'todo')
    status_kr = {
        'todo': '대기',
        'in_progress': '진행중',
        'done': '완료'
    }.get(task_status, task_status)
    
    task_title = task.get('title', '')
    task_description = task.get('description', '') if task.get('description') else '(설명 없음)'
    
    # 커밋 상세 정보 (코드 변경사항 포함)
    commits_detail = []
    for commit in commits[:30]:
        msg = commit.get('message', '')
        files = commit.get('files', [])
        
        code_changes = []
        for f in files[:10]:
            path = f.get('path', '')
            patch = f.get('patch', '')
            if patch:
                patch_preview = patch[:600] if len(patch) > 600 else patch
                code_changes.append(f"  파일: {path}")
                code_changes.append(f"    코드 변경:\n{patch_preview}")
                if len(patch) > 600:
                    code_changes.append(f"    ... (총 {len(patch)}자)")
            else:
                code_changes.append(f"  파일: {path} (코드 변경사항 없음)")
        
        commit_info = f"""
커밋: {msg[:100]}
SHA: {commit.get('sha', '')[:8]}
날짜: {commit.get('date', '')}
변경: +{commit.get('linesAdded', 0)}/-{commit.get('linesDeleted', 0)}줄, {commit.get('filesChanged', 0)}개 파일
파일 및 코드 변경사항:
{chr(10).join(code_changes) if code_changes else '  (파일 정보 없음)'}
"""
        commits_detail.append(commit_info)
    
    commits_text = '\n'.join(commits_detail) if commits_detail else "커밋 없음"
    
    prompt = f"""당신은 Task 완료 여부를 최종 판단하는 AI 에이전트입니다.

⚠️ 중요: 반드시 한국어로만 응답하세요.

## 분석 대상 Task
제목: {task_title}
설명: {task_description}
현재 상태: {status_kr} ({task_status})

## 이전 분석 결과
{initial_analysis.get('reason', 'N/A')}
예상 구현 위치: {initial_analysis.get('expectedLocation', 'N/A')}
추가 탐색 전략: {initial_analysis.get('searchStrategy', 'N/A')}

## 2차 분석: 추가 탐색 및 최종 판단

이전 분석에서 예상한 위치({initial_analysis.get('expectedLocation', 'N/A')})를 중심으로 다음을 수행하세요:

1. **예상 위치 확인**:
   - 예상 위치 "{initial_analysis.get('expectedLocation', 'N/A')}"에 해당하는 파일이 커밋에 포함되어 있는가?
   - 해당 파일의 코드 변경사항을 상세히 분석하세요.

2. **기능 구현 여부 판단**:
   - 예상 위치에 기능이 **완전히 구현**되어 있는가? → 완료
   - 예상 위치에 기능이 **부분적으로 구현**되어 있는가? → 진행 중
   - 예상 위치에 기능이 **없는가**? → 미구현
   - 다른 위치에 기능이 구현되어 있는가? → 위치 확인 필요

3. **코드 변경사항 상세 분석**:
   - 추가된 코드가 Task 요구사항을 구현하는가?
   - 수정된 코드가 Task 설명을 반영하는가?
   - 코드 변경사항이 Task의 목적을 달성하는가?

4. **최종 판단**:
   - Task 완료 여부 결정
   - 완료도 결정
   - 신뢰도 결정

## 커밋 목록 (코드 변경사항 포함)
{commits_text}

## 응답 형식
다음 JSON 형식으로만 응답하세요 (반드시 한국어로):
{{
  "isCompleted": true 또는 false,
  "completionPercentage": 0-100,
  "confidence": "high|medium|low",
  "reason": "단계별 분석 과정을 한국어로 상세히 설명 (예상 위치 확인 결과, 기능 구현 여부, 코드 분석 결과, 최종 판단 근거)",
  "evidence": ["증거1 (예: '예상 위치 backend/services/githubService.js에서 GitHub API 호출 방식 변경 확인')", "증거2", ...],
  "recommendation": "추천사항을 한국어로 작성",
  "locationFound": "기능이 실제로 구현된 위치 (예: 'backend/services/githubService.js')",
  "implementationStatus": "완전 구현|부분 구현|미구현"
}}"""
    
    return prompt

def create_optimized_completion_prompt(task, commits, projectDescription):
    """최적화된 Task 완료 확인 프롬프트 생성 (기존 호환성 유지)"""
    return create_initial_completion_prompt(task, commits, projectDescription)

def create_intent_classification_prompt(user_message, conversation_history=None, project_context=None):
    """사용자 질의의 의도를 분석하여 적절한 agent를 선택하는 프롬프트 생성"""
    
    # 대화 히스토리 요약 (최근 3개만)
    history_context = ""
    if conversation_history:
        recent_messages = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
        history_context = "\n\n## 최근 대화 히스토리:\n"
        for msg in recent_messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')[:100]  # 최대 100자만
            history_context += f"- {role}: {content}\n"
    
    # 프로젝트 컨텍스트 요약
    project_info = ""
    if project_context:
        project_info = f"""
## 프로젝트 정보:
- 프로젝트 설명: {project_context.get('projectDescription', 'N/A')[:200]}
- 커밋 수: {len(project_context.get('commits', []))}개
- Task 수: {len(project_context.get('tasks', []))}개
- 이슈 수: {len(project_context.get('issues', []))}개
"""
    
    prompt = f"""당신은 프로젝트 관리 AI 어시스턴트의 의도 분류기입니다.

사용자의 질의를 분석하여 다음 5가지 agent 중 하나를 선택해야 합니다:

1. **task_suggestion_agent**: 새로운 Task 제안이 필요한 경우
   - 예시: "할 일 추천해줘", "새로운 작업 제안해줘", "다음에 뭘 해야 할까?", "추가로 해야 할 일이 있어?"

2. **progress_analysis_agent**: 프로젝트 진행도 분석이 필요한 경우
   - 예시: "진행도 알려줘", "프로젝트 상태 분석해줘", "지금까지 얼마나 진행됐어?", "지연 위험이 있어?"

3. **task_completion_agent**: 특정 Task의 완료 여부 확인이 필요한 경우
   - 예시: "이 작업 완료됐어?", "Task 완료 확인해줘", "이 작업 상태 알려줘", "작업이 끝났는지 확인해줘"

4. **task_assignment_agent**: Task 할당 추천이 필요한 경우
   - 예시: "이 Task를 누구에게 할당하면 좋을까?", "Task 할당 추천해줘", "이 작업 누가 하면 좋을까?", "담당자 추천해줘"
   - Task 제목이나 설명이 포함된 질문에서 담당자 추천을 요청하는 경우

5. **general_qa_agent**: 프로젝트에 대한 일반적인 질문이나 정보 요청
   - 예시: "프로젝트 설명해줘", "커밋 몇 개야?", "작업 몇 개 있어?", "팀원 누가 있어?", "이 프로젝트 뭐야?", "프로젝트 정보 알려줘"
   - 프로젝트 정보, 통계, 상태 등에 대한 질문
   - 단, 위 4가지 agent로 처리할 수 있는 질문은 해당 agent를 선택

{project_info}

{history_context}

## 사용자 질의:
"{user_message}"

## 응답 형식
다음 JSON 형식으로만 응답하세요 (반드시 한국어로):
{{
  "agent_type": "task_suggestion_agent|progress_analysis_agent|task_completion_agent|task_assignment_agent|general_qa_agent",
  "confidence": "high|medium|low",
  "reason": "선택한 agent를 선택한 이유를 한국어로 설명",
  "extracted_info": {{
    "task_title": "질의에서 추출한 Task 제목 (task_completion_agent인 경우만)",
    "question_type": "질문 유형 (project_info|statistics|team|other)",
    "keywords": ["키워드1", "키워드2"]
  }}
}}

규칙:
- 질의가 모호한 경우 general_qa_agent를 기본값으로 선택
- Task 제목이 명시되지 않은 경우 task_completion_agent를 선택하지 마세요
- 프로젝트 정보나 통계에 대한 질문은 general_qa_agent 선택
- 반드시 한국어로만 응답하세요."""
    
    return prompt

def create_project_creation_prompt(natural_language_input):
    """자연어 입력에서 프로젝트 정보를 추출하는 프롬프트 생성"""
    prompt = f"""당신은 프로젝트 관리 AI 어시스턴트입니다. 사용자의 자연어 입력을 분석하여 프로젝트명과 설명을 추출하세요.

⚠️ 중요: 반드시 한국어로만 응답하세요.

## 사용자 입력:
"{natural_language_input}"

## 추출해야 할 정보:
1. **프로젝트명 (title)**: 프로젝트의 제목을 추출하세요. 간결하고 명확하게 작성하세요.
2. **프로젝트 설명 (description)**: 프로젝트의 목적, 기능, 기술 스택 등을 포함한 상세 설명을 **마크다운 형식**으로 작성하세요.

## 규칙:
- GitHub URL이나 저장소 정보는 추출하지 마세요 (제외)
- 프로젝트명은 255자 이하로 작성하세요
- 설명은 **마크다운 형식**으로 작성하세요 (예: ## 제목, - 리스트, **굵게**, `코드` 등)
- 설명에는 다음 섹션을 포함하세요:
  - ## 프로젝트 목적
  - ## 주요 기능
  - ## 기술 스택
  - ## 기간/일정 (가능한 경우)
- 설명은 구체적이고 유용한 정보를 포함하세요
- 사용자 입력이 모호한 경우, 합리적으로 추론하여 작성하세요
- 한국어로 자연스럽게 작성하세요

## 응답 형식
다음 JSON 형식으로만 응답하세요 (반드시 한국어로):
{{
  "title": "프로젝트명",
  "description": "프로젝트에 대한 상세 설명"
}}"""
    
    return prompt

def create_task_assignment_prompt(task_title, task_description, project_members_with_tags):
    """Task 할당을 위한 프롬프트 생성"""
    members_info = ""
    for member in project_members_with_tags:
        tags_str = ", ".join(member.get('tags', [])) if member.get('tags') else "태그 없음"
        members_info += f"- 사용자 ID {member['userId']} ({member.get('nickname', 'Unknown')}): {tags_str}\n"
    
    prompt = f"""당신은 프로젝트 관리 AI 어시스턴트입니다. Task의 내용을 분석하여 가장 적합한 담당자를 추천하세요.

⚠️ 중요: 반드시 한국어로만 응답하세요.

## Task 정보:
제목: {task_title}
설명: {task_description or '설명 없음'}

## 프로젝트 멤버 정보:
{members_info if members_info else "멤버 정보 없음"}

## 추천 규칙:
1. Task의 내용과 멤버의 태그(직무)를 매칭하여 추천하세요
2. Task가 여러 직무를 포함하는 경우, 가장 핵심적인 직무를 담당하는 멤버를 추천하세요
3. 적합한 멤버가 없는 경우, null을 반환하세요
4. 추천 이유를 명확하게 설명하세요

## 응답 형식
다음 JSON 형식으로만 응답하세요 (반드시 한국어로):
{{
  "recommendedUserId": 사용자ID 또는 null,
  "reason": "추천 이유를 한국어로 설명",
  "confidence": "high|medium|low"
}}"""
    
    return prompt
