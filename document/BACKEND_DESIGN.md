# 백엔드 설계 문서

## 1. 아키텍처 개요

```
┌─────────────┐
│  Frontend   │
│   (React)   │
└──────┬──────┘
       │ HTTP/REST API
       ▼
┌─────────────────────────────────────┐
│      Backend (Node.js + Express)    │
│  ┌──────────┐  ┌─────────────────┐ │
│  │  Routes  │→ │   Services      │ │
│  │ (라우팅 + │  │ (Business Logic)│ │
│  │ 컨트롤러) │  │                 │ │
│  └────┬─────┘  └────────┬────────┘ │
│       │                 │          │
│  ┌────▼─────────────────▼────┐   │
│  │     Middleware            │   │
│  │  (Auth, Validation, etc)  │   │
│  └────────────┬──────────────┘   │
└───────────────┼──────────────────┘
                │
       ┌────────┴────────┐
       │                 │
┌──────▼──────┐  ┌───────▼──────┐
│  Database  │  │ AI Backend   │
│  (MySQL)   │  │  (Flask)    │
└────────────┘  └──────────────┘
```

## 2. 디렉토리 구조

```
backend/
├── app.js                 # Express 앱 설정
├── bin/
│   └── www               # 서버 실행 파일
├── database/
│   ├── db.js             # DB 연결 및 스키마 초기화
│   └── migrations/       # 마이그레이션 (필요시)
├── middleware/
│   ├── auth.js           # JWT 인증
│   ├── validation.js     # 입력 검증
│   └── errorHandler.js   # 에러 핸들링
├── routes/
│   ├── index.js          # 기본 라우트
│   ├── user.js           # 사용자 API 라우팅
│   ├── project.js        # 프로젝트 API 라우팅
│   ├── task.js           # Task API 라우팅
│   ├── github.js         # GitHub 연동 API 라우팅
│   ├── progress.js       # 진행도 API 라우팅
│   └── ai.js             # AI API 라우팅
├── controllers/
│   ├── userController.js      # 사용자 컨트롤러
│   ├── projectController.js   # 프로젝트 컨트롤러
│   ├── taskController.js      # Task 컨트롤러
│   ├── githubController.js    # GitHub 컨트롤러
│   ├── progressController.js  # 진행도 컨트롤러
│   └── aiController.js        # AI 컨트롤러
├── services/
│   ├── userService.js    # 사용자 비즈니스 로직
│   ├── projectService.js # 프로젝트 비즈니스 로직
│   ├── taskService.js    # Task 비즈니스 로직
│   ├── githubService.js  # GitHub API 클라이언트
│   ├── progressAnalyzer.js # 진행도 분석
│   └── aiService.js      # AI 백엔드 연동
├── utils/
│   ├── errors.js         # 커스텀 에러 클래스
│   ├── logger.js         # 로깅 유틸리티
│   └── validators.js     # 검증 함수
├── .env                  # 환경 변수
└── package.json
```

## 3. 데이터베이스 설계

### 3.1 스키마 상세 설계

#### Users 테이블
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,          -- 사용자 고유 ID
  email VARCHAR(255) UNIQUE NOT NULL,          -- 이메일 주소 (로그인용)
  password VARCHAR(255) NOT NULL,              -- 암호화된 비밀번호
  nickname VARCHAR(255) NOT NULL,              -- 사용자 닉네임
  profile_image VARCHAR(255) DEFAULT 'basic.png', -- 프로필 이미지 파일명
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 계정 생성일시
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email ON users(email);
```

#### Projects 테이블
```sql
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,          -- 프로젝트 고유 ID
  title VARCHAR(255) NOT NULL,                -- 프로젝트 제목
  description TEXT,                           -- 프로젝트 설명
  project_code VARCHAR(6) UNIQUE,              -- 프로젝트 코드 (참여용, 자동 생성, 선택)
  password_hash VARCHAR(255),                 -- 프로젝트 비밀번호 (암호화, 공유 프로젝트용, 선택)
  owner_id INT NOT NULL,                      -- 프로젝트 소유자 ID (FK → users.id)
  github_repo VARCHAR(500),                   -- GitHub 저장소 URL
  github_token VARCHAR(255),                   -- GitHub Personal Access Token (프로젝트별 저장, 선택)
  github_last_synced_at DATETIME NULL,        -- GitHub 마지막 동기화 일시
  status VARCHAR(20) DEFAULT 'active',         -- 프로젝트 상태
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 프로젝트 생성일시
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 프로젝트 정보 수정일시
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_code ON projects(project_code);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_github_synced ON projects(github_last_synced_at);
```

#### ProjectMembers 테이블
```sql
CREATE TABLE project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,          -- 프로젝트-사용자 관계 고유 ID
  project_id INT NOT NULL,                    -- 프로젝트 ID (FK → projects.id)
  user_id INT NOT NULL,                       -- 사용자 ID (FK → users.id)
  role VARCHAR(20) DEFAULT 'member',          -- 역할 (owner, admin, member)
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 프로젝트 참여일시
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_user (project_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
```

#### Tasks 테이블
```sql
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,          -- 작업 고유 ID
  project_id INT NOT NULL,                    -- 소속 프로젝트 ID (FK → projects.id)
  assigned_user_id INT,                       -- 할당된 사용자 ID (FK → users.id, 선택)
  title VARCHAR(255) NOT NULL,                -- 작업 제목
  description TEXT,                           -- 작업 설명
  status VARCHAR(20) DEFAULT 'todo',          -- 작업 상태
  due_date DATETIME,                         -- 마감일
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 작업 생성일시
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 작업 수정일시
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

#### ProjectCommits 테이블
```sql
CREATE TABLE project_commits (
  id INT AUTO_INCREMENT PRIMARY KEY,          -- 커밋 기록 고유 ID
  project_id INT NOT NULL,                    -- 소속 프로젝트 ID (FK → projects.id)
  task_id INT,                                -- 연결된 작업 ID (FK → tasks.id, 선택)
  commit_sha VARCHAR(40) NOT NULL,           -- 커밋 SHA 해시값
  commit_message TEXT,                        -- 커밋 메시지
  author VARCHAR(255),                        -- 커밋 작성자 이름
  commit_date DATETIME,                      -- 커밋 일시
  lines_added INT DEFAULT 0,                 -- 추가된 코드 라인 수
  lines_deleted INT DEFAULT 0,               -- 삭제된 코드 라인 수
  files_changed INT DEFAULT 0,               -- 변경된 파일 수
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 레코드 생성일시
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  UNIQUE KEY unique_project_commit (project_id, commit_sha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_commits_project ON project_commits(project_id);
CREATE INDEX idx_commits_task ON project_commits(task_id);
CREATE INDEX idx_commits_date ON project_commits(commit_date);
CREATE INDEX idx_commits_sha ON project_commits(commit_sha);
```

#### ProjectIssues 테이블
```sql
CREATE TABLE project_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,          -- 이슈 기록 고유 ID
  project_id INT NOT NULL,                    -- 소속 프로젝트 ID (FK → projects.id)
  issue_number INT NOT NULL,                  -- GitHub 이슈 번호
  title VARCHAR(255),                         -- 이슈 제목
  body TEXT,                                  -- 이슈 본문
  state VARCHAR(20) DEFAULT 'open',           -- 이슈 상태 ('open', 'closed')
  assignees TEXT,                             -- 담당자 목록 (JSON 배열)
  labels TEXT,                                -- 라벨 목록 (JSON 배열)
  created_at DATETIME,                        -- 이슈 생성일시 (GitHub)
  updated_at DATETIME,                        -- 이슈 수정일시 (GitHub)
  closed_at DATETIME,                         -- 이슈 닫힌 일시 (GitHub)
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 동기화 일시
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_issue (project_id, issue_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_issues_project ON project_issues(project_id);
CREATE INDEX idx_issues_number ON project_issues(issue_number);
CREATE INDEX idx_issues_state ON project_issues(state);
CREATE INDEX idx_issues_synced ON project_issues(synced_at);
```

#### ProjectBranches 테이블
```sql
CREATE TABLE project_branches (
  id INT AUTO_INCREMENT PRIMARY KEY,          -- 브랜치 기록 고유 ID
  project_id INT NOT NULL,                    -- 소속 프로젝트 ID (FK → projects.id)
  branch_name VARCHAR(255) NOT NULL,          -- 브랜치 이름
  commit_sha VARCHAR(40),                    -- 최신 커밋 SHA
  is_protected BOOLEAN DEFAULT FALSE,         -- 보호된 브랜치 여부
  is_default BOOLEAN DEFAULT FALSE,           -- 기본 브랜치 여부
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 동기화 일시
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_branch (project_id, branch_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_branches_project ON project_branches(project_id);
CREATE INDEX idx_branches_name ON project_branches(branch_name);
CREATE INDEX idx_branches_synced ON project_branches(synced_at);
```

#### AI_Logs 테이블
```sql
CREATE TABLE ai_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,          -- AI 로그 고유 ID
  user_id INT NOT NULL,                       -- 요청한 사용자 ID (FK → users.id)
  task_id INT,                                -- 관련 작업 ID (FK → tasks.id, 선택)
  project_id INT,                             -- 관련 프로젝트 ID (FK → projects.id, 프로젝트별 로그 조회용)
  type VARCHAR(50) NOT NULL,                  -- AI 기능 타입
  input TEXT,                                 -- AI에 입력된 데이터 (JSON 형태)
  output TEXT,                               -- AI 응답 결과 (JSON 형태)
  feedback TEXT,                              -- 사용자 피드백 (선택)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 로그 생성일시
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ai_logs_user ON ai_logs(user_id);
CREATE INDEX idx_ai_logs_project ON ai_logs(project_id);
CREATE INDEX idx_ai_logs_type ON ai_logs(type);
CREATE INDEX idx_ai_logs_created ON ai_logs(created_at);
```

### 3.2 FOREIGN KEY 활성화

MySQL은 기본적으로 FOREIGN KEY를 지원하며, InnoDB 엔진에서 자동으로 활성화됩니다:

```javascript
// database/db.js
pool.query('SET FOREIGN_KEY_CHECKS = 1');
```

### 3.3 데이터 타입 및 제약조건

- **Status 필드**: ENUM 타입 또는 VARCHAR로 허용 값 제한
- **UNIQUE 제약조건**: 중복 방지 (email, project_code, project_id+commit_sha)
- **CASCADE/SET NULL**: 적절한 삭제 정책 적용
- **인덱스**: 자주 조회되는 컬럼에 인덱스 추가
- **엔진**: InnoDB 사용 (외래 키 및 트랜잭션 지원)
- **문자셋**: utf8mb4 사용 (한글 및 이모지 지원)

## 4. API 설계

### 4.1 공통 규칙

#### 요청 형식
- 인증: `Authorization: Bearer <token>`
- Content-Type: `application/json`
- 날짜 형식: ISO 8601 (예: `2024-01-15T10:30:00Z`)

#### 인증 규칙
- **인증 필요** 표시된 API는 JWT 토큰이 필요합니다
- 먼저 `/api/user/login`으로 로그인하여 토큰을 받아야 합니다
- 요청 시 `Authorization` 헤더에 `Bearer <token>` 형식으로 포함해야 합니다
- 토큰이 없거나 유효하지 않으면 `401 Unauthorized` 응답을 받습니다

#### HTTP 상태 코드
- `200` OK: 조회 성공
- `201` Created: 생성 성공
- `400` Bad Request: 잘못된 요청
- `401` Unauthorized: 인증 필요
- `403` Forbidden: 권한 없음
- `404` Not Found: 리소스 없음
- `500` Internal Server Error: 서버 오류

### 4.2 User API

#### POST `/api/user/signup` ✅
회원가입

`201 Created`

#### POST `/api/user/login` ✅
로그인

`200 OK`

#### GET `/api/user/duplicate?email=user@example.com` ✅
이메일 중복 확인

`200 OK`

#### GET `/api/user/me` ✅
내 정보 조회 (인증 필요)

`200 OK`

#### PUT `/api/user/me` ✅
회원 정보 수정 (인증 필요)

`200 OK`

#### POST `/api/user/me/profile-image` ✅
프로필 이미지 업로드 (인증 필요)

`200 OK`

#### DELETE `/api/user/me/profile-image` ✅
프로필 이미지 삭제 (인증 필요)

`200 OK`

#### DELETE `/api/user/me` ✅
회원 탈퇴 (인증 필요)

`200 OK`

### 4.3 Project API

#### POST `/api/project/create` ✅
프로젝트 생성 (인증 필요)

`201 Created`

**참고:** `title` 필수 필드, `githubRepo`는 선택 사항 (나중에 연결 가능)

#### GET `/api/project/validate-code?projectCode=ABC123` ✅
프로젝트 코드 검증 (인증 필요)

`200 OK`

#### POST `/api/project/join` ✅
프로젝트 참여 (인증 필요, 공유 프로젝트용)

`200 OK`

#### GET `/api/project/members?projectId=1` ✅
프로젝트 구성원 목록 조회 (인증 필요)

`200 OK`

#### GET `/api/project/info` ✅
프로젝트 목록/상세 조회 (인증 필요)

**Query Parameters:**
- `id`: 프로젝트 ID (없으면 목록 조회)

**응답 형식:**

**목록 조회** (`id` 없음):
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "title": "프로젝트 제목",
        "status": "active",
        "memberCount": 3,
        "isShared": true
      }
    ]
  }
}
```

**상세 조회** (`id` 있음):
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "title": "프로젝트 제목",
      "description": "프로젝트 설명",
      "githubRepo": "https://github.com/owner/repo",
      "hasGithubToken": true,
      "status": "active",
      "ownerId": 1,
      "isShared": true,
      "projectCode": "ABC123"
    }
  }
}
```

**참고:**
- `hasGithubToken`: GitHub 토큰 존재 여부 (보안상 전체 토큰은 반환하지 않음)
- 목록 조회는 최소한의 정보만 포함 (리스트 표시용)
- 상세 조회는 모든 정보 포함

`200 OK`

#### POST `/api/project/connect-github` ✅
GitHub 저장소 연결 (인증 필요, owner만)

**Request Body:**
- `projectId`: 프로젝트 ID
- `githubRepo`: GitHub 저장소 URL (필수)
- `githubToken`: GitHub Personal Access Token (선택사항)

**토큰 처리 로직:**
- 새 토큰이 입력되면: 프로젝트에 저장
- 빈 문자열(`""`) 또는 마스킹된 값(`"••••••••••••••••"`)이면: 기존 토큰 유지
- 토큰이 없으면: `null`로 저장 (공개 저장소만 접근 가능)

`200 OK`

**동작:**
- GitHub 저장소 URL과 토큰을 프로젝트에 저장
- 백그라운드에서 GitHub 정보 동기화 시작
- 커밋 정보 가져오기 (최근 30개, 기본 정보 + 통계 정보) → DB에 저장
- 이슈 정보 가져오기 (최근 100개) → DB에 저장
- 브랜치 정보 가져오기 → DB에 저장

**토큰 사용:**
- `githubToken`이 제공되면 프로젝트에 저장하고 사용
- 토큰이 없으면 공개 저장소만 조회 가능 (Rate Limit: IP당 60회/시간)
- 토큰이 있으면 Private 저장소도 접근 가능 (Rate Limit: 5,000회/시간, 토큰 소유자 기준)
- 프로젝트의 모든 멤버가 같은 토큰을 공유하여 사용
- 토큰은 DB에 저장되며, API 응답에는 포함하지 않음 (보안)
- 프로젝트 상세 조회 시 `hasGithubToken` boolean으로 토큰 존재 여부만 확인 가능

**참고:**
- 커밋 상세 통계 정보(lines_added, lines_deleted, files_changed)도 함께 가져와서 저장
- API 호출 수: 총 4 + 커밋 수 회 (커밋 목록 1회 + 각 커밋 상세 통계 커밋 수만큼 + 이슈 목록 1회 + 브랜치 목록 2회)
- 통계 정보 가져오기 실패 시에도 기본 정보는 저장됨
- 저장소 URL만 변경하고 토큰은 유지하려면 `githubToken`을 빈 문자열로 보내면 됨

#### PUT `/api/project/update` ✅
프로젝트 수정 (인증 필요, owner만)

`200 OK`

#### DELETE `/api/project/delete` ✅
프로젝트 삭제 (인증 필요, owner만)

`200 OK`

#### DELETE `/api/project/member` ✅
멤버 삭제 (인증 필요, owner만, owner는 삭제 불가)

`200 OK`

#### DELETE `/api/project/leave` ✅
프로젝트 탈퇴 (인증 필요, 일반 멤버만)

`200 OK`

### 4.4 Task API

#### POST `/api/task/create` ✅
작업 생성 (인증 필요, 프로젝트 멤버)

`201 Created`

#### GET `/api/task/info` ✅
작업 목록/상세 조회 (인증 필요, 프로젝트 멤버)

**Query Parameters:**
- `id`: 작업 ID (있으면 상세 조회)
- `projectId`: 프로젝트 ID (id가 없으면 목록 조회)

`200 OK`

#### PATCH `/api/task/update` ✅
작업 내용 수정 (인증 필요, owner만)

`200 OK`

**수정 가능 필드:** `title`, `description`, `dueDate` (상태는 제외)

#### PATCH `/api/task/status` ✅
작업 상태 수정 (인증 필요, 프로젝트 멤버)

`200 OK`

**상태 값:** `todo`, `in_progress`, `done`, `cancelled`

#### PATCH `/api/task/assign` ✅
작업 할당 (인증 필요, owner만)

`200 OK`

#### DELETE `/api/task/delete` ✅
작업 삭제 (인증 필요, owner만)

`200 OK`

### 4.5 GitHub API

#### POST `/api/github/sync/:projectId` ✅
프로젝트 정보 동기화 (인증 필요)

**Path Parameters:**
- `projectId`: 프로젝트 ID

`200 OK`

**동작:**
- 프로젝트에 저장된 토큰 사용 (`project.github_token`)
- 커밋 정보 가져오기 (최근 100개, 기본 정보 + 통계 정보) → DB에 저장
- 이슈 정보 가져오기 (최근 100개) → DB에 저장
- 브랜치 정보 가져오기 → DB에 저장
- DB에 저장 (중복 체크, UPSERT)
- `projects.github_last_synced_at` 업데이트

**토큰 사용:**
- 프로젝트에 저장된 토큰을 자동으로 사용
- 토큰이 없으면 공개 저장소만 조회 가능
- 토큰이 있으면 Private 저장소도 접근 가능

**참고:** 
- 커밋 상세 통계 정보(lines_added, lines_deleted, files_changed)도 함께 가져와서 저장
- API 호출 수: 총 4 + 커밋 수 회 (커밋 목록 1회 + 각 커밋 상세 통계 커밋 수만큼 + 이슈 목록 1회 + 브랜치 목록 2회)
- 통계 정보 가져오기 실패 시에도 기본 정보는 저장됨

#### GET `/api/github/commits/:projectId` ✅
커밋 목록 조회 (인증 필요, DB에 저장된 데이터)

**Path Parameters:**
- `projectId`: 프로젝트 ID

**Query Parameters:**
- `limit`: 조회할 커밋 수 (기본값: 50, 최대: 100)
- `offset`: 페이지 오프셋 (기본값: 0)
- `author`: 작성자 필터
- `since`: 시작 날짜 (ISO 8601 형식)
- `until`: 종료 날짜 (ISO 8601 형식)

`200 OK`

#### GET `/api/github/commits/:projectId/:commitSha` ✅
커밋 상세 조회 (인증 필요, DB에 저장된 데이터)

**Path Parameters:**
- `projectId`: 프로젝트 ID
- `commitSha`: 커밋 SHA

`200 OK`

**참고:** DB에 저장된 데이터 조회

#### GET `/api/github/issues/:projectId` ✅
이슈 목록 조회 (인증 필요, DB에 저장된 데이터)

**Path Parameters:**
- `projectId`: 프로젝트 ID

**Query Parameters:**
- `state`: 이슈 상태 (`all`, `open`, `closed`, 기본값: `all`)
- `limit`: 조회할 이슈 수 (기본값: 50, 최대: 100)
- `offset`: 페이지 오프셋 (기본값: 0)

`200 OK`

**참고:** 동기화 시 DB에 저장됨

#### GET `/api/github/issues/:projectId/:issueNumber` ✅
이슈 상세 조회 (인증 필요, DB에 저장된 데이터)

**Path Parameters:**
- `projectId`: 프로젝트 ID
- `issueNumber`: 이슈 번호

`200 OK`

**참고:** DB에 저장된 데이터 조회

#### GET `/api/github/branches/:projectId` ✅
브랜치 목록 조회 (인증 필요, DB에 저장된 데이터)

**Path Parameters:**
- `projectId`: 프로젝트 ID

`200 OK`

**참고:** 동기화 시 DB에 저장됨

#### GET `/api/github/branches/:projectId/:branchName` ✅
브랜치 상세 조회 (인증 필요, DB에 저장된 데이터)

**Path Parameters:**
- `projectId`: 프로젝트 ID
- `branchName`: 브랜치 이름

`200 OK`

**참고:** DB에 저장된 데이터 조회, 해당 브랜치의 최신 커밋 정보도 포함

#### GET `/api/github/repo-status/:projectId` ✅
GitHub 저장소 연결 상태 확인 (인증 필요)

**Path Parameters:**
- `projectId`: 프로젝트 ID

`200 OK`

**응답 데이터:**
- `connected`: 연결 여부
- `repoUrl`: 저장소 URL
- `isPrivate`: Private 저장소 여부
- `lastSyncedAt`: 마지막 동기화 시간
- `stats`: 통계 정보 (커밋 수, 이슈 수, 브랜치 수)

### 4.6 Progress API

#### GET `/api/progress/project/:projectId` ✅
프로젝트 진행도 조회 (인증 필요)

`200 OK`

### 4.7 AI API

#### POST `/api/ai/task-suggestion` ✅
코드 분석 기반 새 Task 제안 (인증 필요)

`200 OK`

## 5. 서비스 레이어 설계

### 5.1 서비스 구조

각 서비스는 해당 도메인의 비즈니스 로직을 담당합니다:

- **userService**: 사용자 인증, 비밀번호 해시
- **projectService**: 프로젝트 CRUD, 프로젝트 코드 생성, 멤버 관리, 권한 확인
- **taskService**: Task CRUD, 상태 변경
- **githubService**: GitHub API 호출, 데이터 파싱, 토큰 기반 인증 지원
- **progressAnalyzer**: 진행도 계산 알고리즘
- **aiService**: AI 백엔드 연동, 로그 저장

### 5.1.1 아키텍처 패턴 비교

#### 방식 1: Routes만 사용
```
routes/
  ├── user.js  (라우팅 + 컨트롤러 로직 모두 포함)
  └── ...

services/
  └── ...
```

**장점:**
- 구조가 단순함
- 파일 수가 적음
- 작은 프로젝트에 적합
- 빠른 개발 가능

**단점:**
- Routes 파일이 커질 수 있음
- 라우팅과 비즈니스 로직이 혼재
- 테스트가 어려울 수 있음
- 재사용성이 낮음

**사용 예시:**
```javascript
// routes/user.js
router.post('/login', async (req, res) => {
  // 여기에 직접 로직 작성
  const { email, password } = req.body;
  const user = await db.get('SELECT * FROM users...');
  // ...
});
```

#### 방식 2: Routes + Controllers 분리 (현재 설계)
```
routes/
  ├── user.js  (라우팅만)
  └── ...

controllers/
  ├── userController.js  (요청/응답 처리)
  └── ...

services/
  └── ...
```

**장점:**
- 관심사 분리 (Separation of Concerns)
- 컨트롤러 재사용 가능
- 테스트하기 쉬움
- 대규모 프로젝트에 적합
- 팀 개발 시 역할 분담 명확

**단점:**
- 파일 수가 많아짐
- 구조가 복잡할 수 있음
- 작은 프로젝트에서는 오버엔지니어링일 수 있음

**사용 예시:**
```javascript
// routes/user.js
router.post('/login', authenticateToken, userController.login);

// controllers/userController.js
exports.login = function(req, res, next) {
  const { email, password } = req.body;
  // 비즈니스 로직 처리
  // ...
};
```

#### 권장사항

- **2주 프로토타입**: Routes만 사용 (방식 1) 권장
  - 빠른 개발이 목표
  - 작은 규모
  - 단순함이 장점

- **장기 운영/확장 예정**: Routes + Controllers 분리 (방식 2) 권장
  - 코드 품질 및 유지보수성
  - 팀 협업 필요
  - 기능 확장 예정

### 5.2 GitHub Service 상세

**GitHubService (`services/githubService.js`):**
- GitHub API 클라이언트 래퍼 (`@octokit/rest` 사용)
- 토큰 기반 인증 지원
- 토큰 없이도 공개 저장소 조회 가능

**토큰 사용 방식:**
- 프로젝트별 토큰 저장 (`project.github_token`)
- 토큰이 있으면 인증된 API 호출 (Rate Limit: 5,000회/시간, 토큰 소유자 기준)
- 토큰이 없으면 공개 저장소만 조회 (Rate Limit: IP당 60회/시간)
- 프로젝트의 모든 멤버가 같은 토큰 공유
- 프로젝트 멤버 중 1명만 토큰을 입력하면 모든 멤버가 사용 가능
- 토큰 업데이트 시 빈 문자열이면 기존 토큰 유지 (저장소 URL만 변경 가능)
- API 응답에는 토큰 값이 포함되지 않으며, `hasGithubToken` boolean으로 존재 여부만 확인

**주요 메서드:**
- `getCommits(repoUrl, options)`: 커밋 목록 가져오기 (기본 정보만)
- `getCommitStats(repoUrl, sha)`: 커밋 상세 정보 (통계 포함, 별도 API 호출)
- `getIssues(repoUrl, options)`: 이슈 목록 가져오기 (PR 제외)
- `getBranches(repoUrl)`: 브랜치 목록 가져오기 (기본 브랜치 정보 포함)

**토큰 저장 및 사용 흐름:**
1. `POST /api/project/connect-github`: 토큰을 프로젝트에 저장
2. `POST /api/github/sync/:projectId`: 프로젝트에 저장된 토큰 자동 사용
3. 모든 GitHub 정보 조회 API: DB에서 조회 (토큰 불필요)

### 5.3 에러 처리

커스텀 에러 클래스 사용:

```javascript
class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// 사용 예시
throw new AppError('PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.', 404);
```

## 6. 보안 고려사항

### 6.1 인증/인가
- JWT 토큰 기반 인증
- 토큰 만료 시간: 없음 (로그아웃 전까지 유지)
- 로그아웃: 프론트엔드에서 토큰 삭제로 처리 (백엔드 API 없음)
- 리프레시 토큰: 미사용

### 6.2 데이터 보안
- 비밀번호: bcrypt 해시 (salt rounds: 10)
- SQL Injection 방지: 파라미터화된 쿼리 사용
- GitHub 토큰: 프로젝트별로 DB에 저장, API 응답에는 포함하지 않음
  - 프로젝트 상세 조회 시 `hasGithubToken` boolean으로 토큰 존재 여부만 반환
  - 전체 토큰 값은 절대 응답에 포함하지 않음
- GitHub 저장소: 토큰 없이 공개 저장소만 지원, 토큰 있으면 Private 저장소도 지원
- 이메일: 회원 정보 수정 시 변경 불가 (중복 체크 및 수정 제한)

### 6.3 입력 검증
- 모든 입력값 검증 (`utils/validators.js` 사용)
- 이메일 형식 검증
- 비밀번호: 최대 255자 제한 (최소 길이 제한 없음)
- 닉네임: 1-255자 제한
- 프로젝트 제목: 1-255자 제한
- 프로젝트 설명: 최대 20,000자 제한
- GitHub URL 형식 검증
- 작업 제목: 1-255자 제한
- 작업 설명: 최대 20,000자 제한
- 프로젝트 비밀번호: 최소 4자, 최대 255자 제한
- 프로젝트 코드: 6자리 영숫자 검증
- ID 검증: 숫자 타입 및 양수 검증

## 7. 환경 변수

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=todo_ai

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
# JWT 토큰 만료 시간 없음 (로그아웃 전까지 유지)

# AI Backend
AI_BACKEND_URL=http://localhost:5000

# CORS
CORS_ORIGIN=http://localhost:5173

# GitHub 토큰은 프로젝트별로 저장 (환경변수 사용 안 함)
```

## 8. 구현 우선순위

### Phase 1: 핵심 기능 (Week 1)
1. ✅ 데이터베이스 스키마 (FOREIGN KEY 활성화, 인덱스 추가)
2. ✅ User API (회원가입, 로그인)
3. ✅ Project API (프로젝트 생성, 참여, 멤버 관리)
4. ✅ Task API

### Phase 2: GitHub 연동 (Week 1)
6. ✅ GitHub Service 구현 (토큰 기반 인증 지원)
7. ✅ GitHub API (동기화, 조회)
8. ✅ 프로젝트별 토큰 저장 및 사용
9. ✅ Task-이슈 자동 연동

### Phase 3: 진행도 분석 (Week 1)
10. ✅ Progress Analyzer
11. ✅ Progress API

### Phase 4: AI 연동 (Week 1-2)
12. ✅ AI Service (백엔드 프록시)
13. ✅ AI API
14. ✅ AI 로그 저장

## 8.1 구현 상태 요약

### ✅ 구현 완료된 API

**User API (8개)**
- ✅ 회원가입, 로그인
- ✅ 이메일 중복 확인
- ✅ 내 정보 조회/수정
- ✅ 프로필 이미지 업로드/삭제
- ✅ 회원 탈퇴
- ⚠️ 로그아웃: 프론트엔드에서 토큰 삭제로 처리 (백엔드 API 없음)

**Project API (10개)**
- ✅ 프로젝트 생성 (title 필수, githubRepo 선택 사항)
- ✅ 프로젝트 코드 검증
- ✅ 프로젝트 참여
- ✅ 구성원 목록 조회
- ✅ 프로젝트 목록/상세 조회
- ✅ GitHub 저장소 연결
- ✅ 프로젝트 수정 (owner만)
- ✅ 프로젝트 삭제 (owner만)
- ✅ 멤버 삭제 (owner만)
- ✅ 프로젝트 탈퇴 (일반 멤버만)

**Task API (6개)**
- ✅ 작업 생성 (프로젝트 멤버)
- ✅ 작업 목록/상세 조회 (프로젝트 멤버, id 또는 projectId로 조회)
- ✅ 작업 내용 수정 (owner만, 제목/설명/마감일/GitHub 이슈만)
- ✅ 작업 상태 수정 (프로젝트 멤버)
- ✅ 작업 할당 (owner만)
- ✅ 작업 삭제 (owner만)

**GitHub API (7개)**
- ✅ 프로젝트 정보 동기화 (커밋 기본 정보 + 통계 정보, 이슈, 브랜치)
  - 프로젝트별 토큰 저장 및 사용 지원
  - 토큰 없이도 공개 저장소 조회 가능
- ✅ 커밋 목록 조회 (DB에 저장된 데이터)
- ✅ 커밋 상세 조회 (DB에 저장된 데이터)
- ✅ 이슈 목록 조회 (DB에 저장된 데이터)
- ✅ 이슈 상세 조회 (DB에 저장된 데이터)
- ✅ 브랜치 목록 조회 (DB에 저장된 데이터)
- ✅ 브랜치 상세 조회 (DB에 저장된 데이터)

**참고:** 
- 커밋 상세 통계 정보(lines_added, lines_deleted, files_changed)도 함께 가져와서 저장
- API 호출 수: 동기화 시 커밋 수만큼 추가 호출 (각 커밋의 상세 통계 정보)
- 토큰은 프로젝트별로 저장되며, 프로젝트의 모든 멤버가 공유
- 프로젝트 멤버 중 1명만 토큰을 입력하면 모든 멤버가 사용 가능
- 토큰 업데이트 시 빈 문자열이면 기존 토큰 유지 기능 지원
- 프로젝트 상세 조회 시 `hasGithubToken` 필드로 토큰 존재 여부 확인 가능

**Progress API (1개)**
- ✅ 프로젝트 진행도 조회

**AI API (1개)**
- ✅ Task 제안

**총 33개 API 구현 완료** ✅

## 9. 테스트 전략

- 단위 테스트: 각 서비스 함수
- 통합 테스트: API 엔드포인트
- 테스트 도구: Jest, Supertest

