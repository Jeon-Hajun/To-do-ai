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
│  (SQLite)  │  │  (Flask)    │
└────────────┘  └──────────────┘
```

## 2. 디렉토리 구조

```
backend/
├── app.js                 # Express 앱 설정
├── bin/
│   └── www               # 서버 실행 파일
├── config/
│   └── database.js       # DB 설정 및 연결
├── database/
│   ├── init.js           # 스키마 초기화
│   └── migrations/       # 마이그레이션 (필요시)
├── middleware/
│   ├── auth.js           # JWT 인증
│   ├── validation.js     # 입력 검증
│   └── errorHandler.js   # 에러 핸들링
├── routes/
│   ├── index.js          # 기본 라우트
│   ├── user.js           # 사용자 API
│   ├── project.js        # 프로젝트 API
│   ├── task.js           # Task API
│   ├── github.js         # GitHub 연동 API
│   ├── progress.js       # 진행도 API
│   └── ai.js             # AI API (프록시)
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,          -- 사용자 고유 ID
  email VARCHAR(100) UNIQUE NOT NULL,            -- 이메일 주소 (로그인용)
  password VARCHAR(255) NOT NULL,                -- 암호화된 비밀번호
  nickname VARCHAR(50) NOT NULL,                  -- 사용자 닉네임
  profile_image VARCHAR(255) DEFAULT 'basic.png', -- 프로필 이미지 파일명
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 계정 생성일시
);

CREATE INDEX idx_users_email ON users(email);
```

#### Projects 테이블
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,          -- 프로젝트 고유 ID
  title TEXT NOT NULL,                            -- 프로젝트 제목
  description TEXT,                               -- 프로젝트 설명
  project_code TEXT UNIQUE,                      -- 프로젝트 코드 (참여용, 자동 생성, 선택)
  password_hash TEXT,                            -- 프로젝트 비밀번호 (암호화, 공유 프로젝트용, 선택)
  owner_id INTEGER NOT NULL,                     -- 프로젝트 소유자 ID (FK → users.id)
  github_repo TEXT,                              -- GitHub 저장소 URL
  github_token TEXT,                             -- GitHub Personal Access Token (암호화 저장, Private 저장소용)
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'completed')), -- 프로젝트 상태
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 프로젝트 생성일시
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 프로젝트 정보 수정일시
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_code ON projects(project_code);
CREATE INDEX idx_projects_status ON projects(status);
```

#### ProjectMembers 테이블
```sql
CREATE TABLE project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,          -- 프로젝트-사용자 관계 고유 ID
  project_id INTEGER NOT NULL,                    -- 프로젝트 ID (FK → projects.id)
  user_id INTEGER NOT NULL,                       -- 사용자 ID (FK → users.id)
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')), -- 역할 (owner, admin, member)
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 프로젝트 참여일시
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
```

#### Tasks 테이블
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,          -- 작업 고유 ID
  project_id INTEGER NOT NULL,                    -- 소속 프로젝트 ID (FK → projects.id)
  assigned_user_id INTEGER,                       -- 할당된 사용자 ID (FK → users.id, 선택)
  title TEXT NOT NULL,                            -- 작업 제목
  description TEXT,                               -- 작업 설명
  status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done', 'cancelled')), -- 작업 상태
  github_issue_number INTEGER,                    -- 연결된 GitHub 이슈 번호 (선택)
  due_date DATETIME,                             -- 마감일
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 작업 생성일시
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 작업 수정일시
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_github_issue ON tasks(github_issue_number);
```

#### ProjectCommits 테이블
```sql
CREATE TABLE project_commits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,          -- 커밋 기록 고유 ID
  project_id INTEGER NOT NULL,                    -- 소속 프로젝트 ID (FK → projects.id)
  task_id INTEGER,                                -- 연결된 작업 ID (FK → tasks.id, 선택)
  commit_sha TEXT NOT NULL,                      -- 커밋 SHA 해시값
  commit_message TEXT,                            -- 커밋 메시지
  author TEXT,                                    -- 커밋 작성자 이름
  commit_date DATETIME,                          -- 커밋 일시
  lines_added INTEGER DEFAULT 0,                 -- 추가된 코드 라인 수
  lines_deleted INTEGER DEFAULT 0,               -- 삭제된 코드 라인 수
  files_changed INTEGER DEFAULT 0,               -- 변경된 파일 수
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 레코드 생성일시
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  UNIQUE(project_id, commit_sha)
);

CREATE INDEX idx_commits_project ON project_commits(project_id);
CREATE INDEX idx_commits_task ON project_commits(task_id);
CREATE INDEX idx_commits_date ON project_commits(commit_date);
CREATE INDEX idx_commits_sha ON project_commits(commit_sha);
```

#### AI_Logs 테이블
```sql
CREATE TABLE ai_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,          -- AI 로그 고유 ID
  user_id INTEGER NOT NULL,                       -- 요청한 사용자 ID (FK → users.id)
  task_id INTEGER,                                -- 관련 작업 ID (FK → tasks.id, 선택)
  project_id INTEGER,                             -- 관련 프로젝트 ID (FK → projects.id, 프로젝트별 로그 조회용)
  type TEXT NOT NULL CHECK(type IN ('task_suggestion', 'refactoring_suggestion', 'completion_check')), -- AI 기능 타입
  input TEXT,                                     -- AI에 입력된 데이터 (JSON 형태)
  output TEXT,                                    -- AI 응답 결과 (JSON 형태)
  feedback TEXT,                                 -- 사용자 피드백 (선택)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- 로그 생성일시
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX idx_ai_logs_user ON ai_logs(user_id);
CREATE INDEX idx_ai_logs_project ON ai_logs(project_id);
CREATE INDEX idx_ai_logs_type ON ai_logs(type);
CREATE INDEX idx_ai_logs_created ON ai_logs(created_at);
```

### 3.2 FOREIGN KEY 활성화

SQLite는 기본적으로 FOREIGN KEY를 무시하므로, 연결 시 반드시 활성화해야 합니다:

```javascript
// database/config.js
db.run('PRAGMA foreign_keys = ON');
```

### 3.3 데이터 타입 및 제약조건

- **Status 필드**: CHECK 제약조건으로 허용 값 제한
- **UNIQUE 제약조건**: 중복 방지 (email, project_code, project_id+commit_sha)
- **CASCADE/SET NULL**: 적절한 삭제 정책 적용
- **인덱스**: 자주 조회되는 컬럼에 인덱스 추가

## 4. API 설계

### 4.1 공통 규칙

#### 요청 형식
- 인증: `Authorization: Bearer <token>`
- Content-Type: `application/json`
- 날짜 형식: ISO 8601 (예: `2024-01-15T10:30:00Z`)

#### 응답 형식
```json
// 성공 응답
{
  "success": true,
  "data": { ... },
  "message": "성공 메시지"
}

// 에러 응답
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": { ... }
  }
}
```

#### HTTP 상태 코드
- `200` OK: 조회 성공
- `201` Created: 생성 성공
- `400` Bad Request: 잘못된 요청
- `401` Unauthorized: 인증 필요
- `403` Forbidden: 권한 없음
- `404` Not Found: 리소스 없음
- `500` Internal Server Error: 서버 오류

### 4.2 User API

#### POST `/api/user/join`
회원가입

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "홍길동"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "홍길동"
  },
  "message": "회원가입이 완료되었습니다."
}
```

#### POST `/api/user/login`
로그인

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "nickname": "홍길동"
    }
  },
  "message": "로그인 성공"
}
```

#### POST `/api/user/logout`
로그아웃 (토큰 블랙리스트 관리 - 선택사항)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "로그아웃되었습니다."
}
```

#### GET `/api/user/duplicate?email=user@example.com`
이메일 중복 확인

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "available": true
  }
}
```

#### GET `/api/user/info`
회원정보 조회 (인증 필요)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "홍길동",
    "profileImage": "basic.png",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 4.3 Project API

#### POST `/api/project/create`
프로젝트 생성 (인증 필요)

**Request:**
```json
{
  "title": "새 프로젝트",
  "description": "프로젝트 설명",
  "isShared": false,
  "password": "project123",
  "githubRepo": "https://github.com/owner/repo"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "새 프로젝트",
    "projectCode": "A1B2C3",
    "githubRepo": "https://github.com/owner/repo"
  },
  "message": "프로젝트가 생성되었습니다."
}
```

#### POST `/api/project/join`
프로젝트 참여 (인증 필요, 공유 프로젝트용)

**Request:**
```json
{
  "projectCode": "A1B2C3",
  "password": "project123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "새 프로젝트"
  },
  "message": "프로젝트에 참여했습니다."
}
```

#### GET `/api/project/members?projectId=1`
프로젝트 구성원 목록 조회 (인증 필요)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": 1,
        "email": "user@example.com",
        "nickname": "홍길동",
        "role": "owner",
        "joinedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### GET `/api/project/info`
프로젝트 목록/상세 조회 (인증 필요)

**Query Parameters:**
- `id`: 프로젝트 ID (없으면 목록 조회)

**Response (목록):** `200 OK`
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "title": "새 프로젝트",
        "status": "active",
        "memberCount": 3,
        "isShared": true
      }
    ]
  }
}
```

**Response (상세):** `200 OK`
```json
{
  "success": true,
  "data": {
    "project": {
      "id": 1,
      "title": "새 프로젝트",
      "description": "프로젝트 설명",
      "githubRepo": "https://github.com/owner/repo",
      "status": "active",
      "ownerId": 1,
      "isShared": true,
      "projectCode": "A1B2C3"
    }
  }
}
```

#### POST `/api/project/connect-github`
GitHub 저장소 연결 (인증 필요)

**Request:**
```json
{
  "projectId": 1,
  "githubRepo": "https://github.com/owner/repo",
  "githubToken": "ghp_xxxxx"  // Private 저장소용 (선택)
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "GitHub 저장소가 연결되었습니다."
}
```

### 4.5 Task API

#### POST `/api/task/create`
작업 생성 (인증 필요)

**Request:**
```json
{
  "projectId": 1,
  "title": "새 작업",
  "description": "작업 설명",
  "assignedUserId": 2,
  "dueDate": "2024-02-01T00:00:00Z",
  "githubIssueNumber": 123
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "새 작업",
    "status": "todo"
  },
  "message": "작업이 생성되었습니다."
}
```

#### GET `/api/task/info?projectId=1`
작업 목록 조회 (인증 필요)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "새 작업",
        "status": "todo",
        "assignedUserName": "김철수",
        "dueDate": "2024-02-01T00:00:00Z"
      }
    ]
  }
}
```

#### PATCH `/api/task/update`
작업 수정 (인증 필요)

**Request:**
```json
{
  "id": 1,
  "title": "수정된 제목",
  "status": "in_progress",
  "description": "수정된 설명"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "작업이 수정되었습니다."
}
```

#### PATCH `/api/task/assign`
작업 할당 (인증 필요)

**Request:**
```json
{
  "id": 1,
  "assignedUserId": 2
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "작업이 할당되었습니다."
}
```

### 4.6 GitHub API

#### POST `/api/github/sync/:projectId`
프로젝트 정보 동기화 (인증 필요)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "commitsSynced": 30,
    "issuesFound": 15,
    "branchesFound": 5,
    "progress": { ... }
  },
  "message": "동기화가 완료되었습니다."
}
```

#### GET `/api/github/commits/:projectId`
커밋 목록 조회 (인증 필요)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "commits": [
      {
        "sha": "abc123",
        "message": "커밋 메시지",
        "author": "홍길동",
        "date": "2024-01-15T10:30:00Z",
        "linesAdded": 100,
        "linesDeleted": 20
      }
    ]
  }
}
```

#### GET `/api/github/issues/:projectId`
이슈 목록 조회 (인증 필요)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "number": 123,
        "title": "버그 수정",
        "state": "open",
        "assignees": ["홍길동"]
      }
    ]
  }
}
```

#### GET `/api/github/branches/:projectId`
브랜치 목록 조회 (인증 필요)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "branches": [
      {
        "name": "main",
        "sha": "abc123",
        "protected": true
      }
    ]
  }
}
```

### 4.7 Progress API

#### GET `/api/progress/project/:projectId`
프로젝트 진행도 조회 (인증 필요)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "taskProgress": 65,
    "taskStats": {
      "total": 20,
      "todo": 5,
      "inProgress": 2,
      "done": 13
    },
    "codeProgress": 75,
    "codeStats": {
      "commitCount": 150,
      "totalLinesAdded": 5000,
      "totalLinesDeleted": 500,
      "activeDays": 30
    },
    "contributions": [
      {
        "author": "홍길동",
        "commitCount": 80,
        "linesAdded": 3000
      }
    ]
  }
}
```

### 4.8 AI API

#### POST `/api/ai/task-suggestion`
코드 분석 기반 새 Task 제안 (인증 필요)

**Request:**
```json
{
  "projectId": 1,
  "includeCommits": true,
  "includeIssues": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "title": "리팩토링 제안",
        "description": "코드 중복 제거 필요",
        "priority": "Medium",
        "estimatedHours": 4
      }
    ]
  },
  "message": "Task 제안이 생성되었습니다."
}
```

## 5. 서비스 레이어 설계

### 5.1 서비스 구조

각 서비스는 해당 도메인의 비즈니스 로직을 담당합니다:

- **userService**: 사용자 인증, 비밀번호 해시
- **projectService**: 프로젝트 CRUD, 프로젝트 코드 생성, 멤버 관리, 권한 확인
- **taskService**: Task CRUD, 상태 변경
- **githubService**: GitHub API 호출, 데이터 파싱
- **progressAnalyzer**: 진행도 계산 알고리즘
- **aiService**: AI 백엔드 연동, 로그 저장

### 5.1.1 아키텍처 패턴 비교

#### 방식 1: Routes만 사용 (현재 설계)
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

#### 방식 2: Routes + Controllers 분리
```
routes/
  ├── userRoutes.js  (라우팅만)
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
// routes/userRoutes.js
router.post('/login', userController.login);

// controllers/userController.js
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const result = await userService.login(email, password);
  res.json(result);
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

### 5.2 에러 처리

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
- 토큰 만료 시간: 24시간
- 리프레시 토큰 (선택사항)

### 6.2 데이터 보안
- GitHub Token: Base64 인코딩 (프로덕션에서는 AES 암호화 권장)
- 비밀번호: bcrypt 해시 (salt rounds: 10)
- SQL Injection 방지: 파라미터화된 쿼리 사용

### 6.3 입력 검증
- 모든 입력값 검증 (Joi 또는 express-validator 사용)
- 이메일 형식 검증
- URL 형식 검증 (GitHub 저장소)
- 날짜 형식 검증

## 7. 환경 변수

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./database/todo.db

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# AI Backend
AI_BACKEND_URL=http://localhost:5000

# CORS
CORS_ORIGIN=http://localhost:5173

# GitHub (선택사항 - 글로벌 Rate Limit 향상용)
GITHUB_TOKEN=
```

## 8. 구현 우선순위

### Phase 1: 핵심 기능 (Week 1)
1. ✅ 데이터베이스 스키마 (FOREIGN KEY 활성화, 인덱스 추가)
2. ✅ User API (회원가입, 로그인, 로그아웃)
3. ✅ Project API (프로젝트 생성, 참여, 멤버 관리)
4. ✅ Task API

### Phase 2: GitHub 연동 (Week 1)
6. ✅ GitHub Service 구현
7. ✅ GitHub API (동기화, 조회)
8. ✅ Task-이슈 자동 연동

### Phase 3: 진행도 분석 (Week 1)
9. ✅ Progress Analyzer
10. ✅ Progress API

### Phase 4: AI 연동 (Week 1-2)
11. ✅ AI Service (백엔드 프록시)
12. ✅ AI API
13. ✅ AI 로그 저장

## 9. 테스트 전략

- 단위 테스트: 각 서비스 함수
- 통합 테스트: API 엔드포인트
- 테스트 도구: Jest, Supertest

