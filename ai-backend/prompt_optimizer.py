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
  "currentProgress": 숫자(0-100),
  "activityTrend": "increasing" 또는 "stable" 또는 "decreasing",
  "estimatedCompletionDate": "YYYY-MM-DD" 또는 null,
  "delayRisk": "Low" 또는 "Medium" 또는 "High",
  "insights": ["한국어 인사이트 1", "한국어 인사이트 2"],
  "recommendations": ["한국어 제안 1", "한국어 제안 2"]
}}"""
    
    return prompt

def create_optimized_completion_prompt(task, commits, projectDescription):
    """AI 기반 Task 완료 확인 프롬프트 생성 - 관련 커밋과 코드 변경사항 분석"""
    
    task_status = task.get('status', 'todo')
    status_kr = {
        'todo': '대기',
        'in_progress': '진행중',
        'done': '완료'
    }.get(task_status, task_status)
    
    # 커밋 상세 정보 구성 (AI가 관련성 판단)
    commits_detail = []
    for commit in commits[:50]:  # 최대 50개 커밋 분석
        msg = commit.get('message', '')
        files = commit.get('files', [])
        task_id = commit.get('taskId')
        
        # 파일 정보 요약
        file_info = []
        for f in files[:10]:  # 각 커밋당 최대 10개 파일
            path = f.get('path', '')
            additions = f.get('additions', 0) or 0
            deletions = f.get('deletions', 0) or 0
            patch_preview = f.get('patch', '')[:200] if f.get('patch') else ''  # 패치 일부
            file_info.append(f"  - {path} (+{additions}/-{deletions})")
            if patch_preview:
                file_info.append(f"    코드 변경: {patch_preview[:150]}...")
        
        # 코드 변경사항 요약 (실제 patch 내용 포함)
        code_changes = []
        for f in files[:10]:  # 각 커밋당 최대 10개 파일
            path = f.get('path', '')
            patch = f.get('patch', '')
            if patch:
                # 패치의 핵심 부분만 추출 (너무 길면 제한)
                patch_preview = patch[:800] if len(patch) > 800 else patch
                code_changes.append(f"  파일: {path}")
                code_changes.append(f"    코드 변경:\n{patch_preview}")
                if len(patch) > 800:
                    code_changes.append(f"    ... (총 {len(patch)}자, 일부만 표시)")
            else:
                code_changes.append(f"  파일: {path} (코드 변경사항 없음)")
        
        commit_info = f"""
커밋: {msg[:100]}
SHA: {commit.get('sha', '')[:8]}
날짜: {commit.get('date', '')}
변경: +{commit.get('linesAdded', 0)}/-{commit.get('linesDeleted', 0)}줄, {commit.get('filesChanged', 0)}개 파일
명시적 Task 연결: {'예 (Task ID: ' + str(task_id) + ')' if task_id else '아니오'}
파일 및 코드 변경사항:
{chr(10).join(code_changes) if code_changes else '  (파일 정보 없음)'}
"""
        commits_detail.append(commit_info)
    
    commits_text = '\n'.join(commits_detail) if commits_detail else "프로젝트에 커밋이 없습니다."
    
    task_title = task.get('title', '')
    task_description = task.get('description', '') if task.get('description') else '(설명 없음)'
    
    prompt = f"""당신은 Task 완료 여부를 단계적으로 분석하는 AI 에이전트입니다.

⚠️ 중요: 반드시 한국어로만 응답하세요. 중국어, 영어 등 다른 언어는 절대 사용하지 마세요.

## ⭐ 분석 대상 Task (이 Task만 분석하세요)
제목: {task_title}
설명: {task_description}
현재 상태: {status_kr} ({task_status})

## 에이전트 분석 프로세스

다음 단계를 순차적으로 진행하세요:

### 1단계: 초기 평가 및 정보 수집
- Task 제목 "{task_title}"의 핵심 키워드와 요구사항을 파악하세요
- Task 설명 "{task_description}"의 내용을 이해하세요
- 제공된 커밋 목록에서 Task와 관련이 있어 보이는 커밋을 식별하세요
- **커밋 메시지는 참고만 하고, 실제 코드 변경사항(patch)을 중점적으로 확인하세요**

### 2단계: 코드 변경사항 분석
각 관련 커밋의 코드 변경사항(patch)을 상세히 분석하세요:
- 추가된 코드가 Task 요구사항을 구현하는가?
- 수정된 코드가 Task 설명을 반영하는가?
- 삭제된 코드가 Task와 관련이 있는가?
- 파일 경로가 Task와 관련이 있는가?

### 3단계: 진행 상황 평가
현재까지 수집한 정보로:
- Task가 완료되었는지, 진행 중인지, 아직 시작되지 않았는지 평가하세요
- 완료도(completionPercentage)를 추정하세요
- 현재 신뢰도(confidence)를 평가하세요

### 4단계: 추가 탐색 필요성 판단
다음 중 하나를 결정하세요:
- **충분한 정보**: 현재 정보로 Task 완료 여부를 확실히 판단할 수 있으면 → 최종 판단 진행
- **추가 탐색 필요**: 정보가 부족하거나 불확실하면 → 어떤 정보가 더 필요한지 명시하고, 가능한 범위에서 추가 분석 시도

### 5단계: 최종 판단 (충분한 정보가 모였을 때만)
- Task 완료 여부(isCompleted) 결정
- 완료도(completionPercentage) 최종 결정
- 신뢰도(confidence) 최종 결정
- 상세한 판단 근거(reason) 작성
- 증거(evidence) 나열
- 추천사항(recommendation) 제시

## 중요 원칙
⚠️ 커밋 메시지는 신뢰성이 낮을 수 있습니다. 실제 코드 변경사항(patch)을 우선적으로 분석하세요.
- 커밋 메시지가 Task와 무관해도 코드 변경사항이 Task를 완료했으면 완료로 판단하세요
- 정보가 부족하면 추가 탐색이 필요하다고 명시하세요
- 충분한 정보가 모였을 때만 최종 판단하세요

## 프로젝트 커밋 목록 (최근 50개)
{commits_text}

## 응답 형식
다음 JSON 형식으로만 응답하세요. ⚠️ 반드시 한국어로만 작성하세요. 중국어, 영어 등 다른 언어는 절대 사용하지 마세요:

**충분한 정보가 모였을 때 (최종 판단):**
{{
  "isCompleted": true 또는 false,
  "completionPercentage": 0-100 숫자,
  "confidence": "high" 또는 "medium" 또는 "low",
  "reason": "단계별 분석 과정과 최종 판단 근거를 한국어로 상세히 설명 (1단계에서 무엇을 파악했는지, 2단계에서 어떤 코드를 분석했는지, 3단계에서 진행 상황을 어떻게 평가했는지, 4단계에서 추가 탐색이 필요한지 판단했는지, 5단계에서 최종 판단을 어떻게 내렸는지)",
  "evidence": ["증거1 (예: '커밋 abc123의 코드 변경사항에서 Task 제목 '{task_title}'와 관련된 기능 구현 확인')", "증거2", ...],
  "recommendation": "추천사항을 한국어로만 작성 (완료되지 않았다면 다음 단계, 완료되었다면 검증 방법 등)",
  "needsMoreInfo": false,
  "additionalInfoNeeded": null
}}

**정보가 부족할 때 (추가 탐색 필요):**
{{
  "isCompleted": null 또는 현재까지의 추정값,
  "completionPercentage": 현재까지의 추정값 또는 null,
  "confidence": "low",
  "reason": "현재까지의 분석 결과와 추가 정보가 필요한 이유를 한국어로 설명",
  "evidence": ["현재까지 수집한 증거들"],
  "recommendation": "추가로 필요한 정보나 탐색 방향을 한국어로 제시",
  "needsMoreInfo": true,
  "additionalInfoNeeded": "추가로 필요한 정보를 한국어로 명시 (예: '더 많은 커밋 확인 필요', '특정 파일의 코드 변경사항 확인 필요', '관련 이슈나 PR 확인 필요' 등)"
}}

⚠️ 중요 규칙:
1. 반드시 한국어로만 응답하세요. 중국어, 영어 등 다른 언어는 절대 사용하지 마세요.
2. 에이전트 방식으로 단계별로 분석하세요. 충분한 정보가 모였을 때만 최종 판단하세요.
3. 커밋 메시지보다 실제 코드 변경사항(patch)을 우선적으로 분석하세요.
4. Task 제목 "{task_title}"와 관련된 코드 변경사항만 분석하세요.
5. 정보가 부족하면 needsMoreInfo를 true로 설정하고 추가로 필요한 정보를 명시하세요."""
    
    return prompt

