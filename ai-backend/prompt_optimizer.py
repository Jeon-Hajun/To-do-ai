"""
프롬프트 최적화 유틸리티
프롬프트 길이를 줄이고 핵심 정보만 추출하여 리소스 소모를 감소시킵니다.
"""

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

    prompt = f"""프로젝트 분석 및 Task 제안:

프로젝트: {projectDescription[:100]}
커밋: {len(commits)}개, +{totalLinesAdded}/-{totalLinesDeleted}줄, 주요파일: {topFileTypes}
이슈: {issue_summary}
작업: {task_summary}

최근 커밋:
{commit_summary}

다음 형식의 JSON 배열로 최대 5개 Task 제안:
[{{"title": "...", "description": "...", "category": "feature|refactor|security|performance|maintenance", "priority": "High|Medium|Low", "estimatedHours": 숫자, "reason": "..."}}]

규칙: 실제 필요한 작업만, High는 보안/심각한 기술부채만, 반드시 한국어로 응답, JSON만 응답."""

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
    
    prompt = f"""진행도 분석:

프로젝트: {projectDescription[:80]}
작업: 총{taskStats['total']}개 (완료:{taskStats['done']}, 진행중:{taskStats['inProgress']}, 대기:{taskStats['todo']})
커밋: 총{commitStats['total']}개, +{commitStats['totalLinesAdded']}/-{commitStats['totalLinesDeleted']}줄, 최근7일:{recent_week}개

다음 JSON 형식으로만 응답 (반드시 한국어로, JSON만 응답):
{{
  "currentProgress": 0-100,
  "activityTrend": "increasing|stable|decreasing",
  "estimatedCompletionDate": "YYYY-MM-DD 또는 null",
  "delayRisk": "Low|Medium|High",
  "insights": ["한국어 인사이트 1", "한국어 인사이트 2"],
  "recommendations": ["한국어 제안 1", "한국어 제안 2"]
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
