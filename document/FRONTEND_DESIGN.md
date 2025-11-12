# 프론트엔드 설계 문서

## 1. 아키텍처 개요

```
┌─────────────────────────────────────┐
│      Frontend (React + Vite)        │
│  ┌──────────┐  ┌─────────────────┐ │
│  │  Pages   │→ │   Components     │ │
│  │ (라우팅)  │  │  (재사용 컴포넌트) │ │
│  └────┬─────┘  └────────┬────────┘ │
│       │                 │          │
│  ┌────▼─────────────────▼────┐   │
│  │     Context API            │   │
│  │  (AuthContext,             │   │
│  │   ProjectContext)          │   │
│  └────────────┬───────────────┘   │
│               │                    │
│  ┌────────────▼───────────────┐   │
│  │     API Layer              │   │
│  │  (axios 기반 API 호출)      │   │
│  └────────────┬───────────────┘   │
└───────────────┼───────────────────┘
                │ HTTP/REST API
                ▼
┌─────────────────────────────────────┐
│      Backend (Node.js + Express)    │
└─────────────────────────────────────┘
```

## 2. 디렉토리 구조

```
morpheus-react/web/src/
├── App.jsx                    # 메인 앱 컴포넌트 (라우팅 설정)
├── main.jsx                   # 진입점
├── theme.js                   # MUI 테마 설정
│
├── pages/                     # 페이지 컴포넌트
│   ├── LoginPage.jsx          # 로그인 페이지
│   ├── SignupPage.jsx         # 회원가입 페이지
│   ├── MainPage.jsx           # 메인 대시보드 (할당된 작업 표시)
│   ├── ProjectPage.jsx        # 프로젝트 목록 페이지
│   ├── ProjectDetailPage.jsx  # 프로젝트 상세 페이지
│   ├── CommitDetailPage.jsx  # 커밋 상세 페이지
│   ├── SettingsPage.jsx      # 설정 페이지
│   ├── AIadvisorPage.jsx     # AI 어드바이저 페이지
│   ├── ProfilePage.jsx       # 프로필 페이지
│   └── Dev/
│       └── DevProjectsPage.jsx
│
├── components/                # 재사용 컴포넌트
│   ├── GitHub/                # GitHub 관련 컴포넌트
│   │   ├── ProjectGitHubTab.jsx    # GitHub 탭 메인 컴포넌트
│   │   ├── CommitList.jsx          # 커밋 목록
│   │   ├── BranchList.jsx          # 브랜치 목록
│   │   ├── IssueList.jsx           # 이슈 목록
│   │   └── DiffViewer.jsx          # 코드 diff 뷰어
│   │
│   ├── Project/               # 프로젝트 관련 컴포넌트
│   │   ├── ProjectCard.jsx         # 프로젝트 카드
│   │   ├── ProjectDetailCard.jsx   # 프로젝트 상세 카드
│   │   ├── ProjectDetailTabs.jsx  # 프로젝트 상세 탭 (상세/작업/GitHub)
│   │   ├── ProjectManager.jsx      # 프로젝트 관리 (생성/참여)
│   │   ├── CreateProject.jsx       # 프로젝트 생성 폼
│   │   ├── JoinProject.jsx         # 프로젝트 참여 폼
│   │   └── task/                   # 작업 관련 컴포넌트
│   │       ├── ProjectTaskList.jsx # 작업 목록
│   │       ├── ProjectTaskCard.jsx # 작업 카드
│   │       ├── ProjectTaskAdd.jsx  # 작업 추가
│   │       └── ProjectTaskEdit.jsx # 작업 수정
│   │
│   ├── ui/                    # 공통 UI 컴포넌트
│   │   ├── Header.jsx             # 헤더
│   │   ├── NavBar.jsx             # 하단 네비게이션 바
│   │   ├── Button.jsx             # 버튼 컴포넌트
│   │   ├── Input.jsx              # 입력 컴포넌트
│   │   ├── ContainerBox.jsx       # 컨테이너 박스
│   │   ├── PageContainer.jsx     # 페이지 컨테이너
│   │   └── ...
│   │
│   ├── EditProfileModal.jsx   # 프로필 수정 모달
│   ├── LoginCard.jsx           # 로그인 카드
│   ├── SignupForm.jsx         # 회원가입 폼
│   └── ...
│
├── context/                   # Context API (전역 상태 관리)
│   ├── AuthContext.jsx        # 인증 상태 관리
│   └── ProjectContext.jsx     # 프로젝트 상태 관리
│
├── api/                       # API 호출 함수
│   ├── projects.js            # 프로젝트 API
│   ├── task.js                # 작업 API
│   ├── githubApi.js           # GitHub API
│   └── taskApi.js             # 작업 API (추가)
│
├── utils/                     # 유틸리티 함수
│   ├── auth.js                # 인증 관련 유틸리티
│   └── profileImage.js        # 프로필 이미지 처리
│
├── constants/                 # 상수 정의
│   ├── navButtons.js          # 네비게이션 버튼 설정
│   └── headerMenu.js          # 헤더 메뉴 설정
│
└── hooks/                     # 커스텀 훅 (사용 안 함)
```

## 3. 기술 스택

### 3.1 핵심 라이브러리
- **React 19.2.0**: UI 라이브러리
- **React Router DOM 7.9.5**: 라우팅
- **Material-UI (MUI) 7.3.5**: UI 컴포넌트 라이브러리
- **Axios 1.13.2**: HTTP 클라이언트
- **Vite**: 빌드 도구 (React Scripts 사용)

### 3.2 주요 MUI 컴포넌트
- `Dialog`, `Modal`: 모달
- `TextField`, `Button`: 폼 요소
- `Card`, `CardContent`: 카드 레이아웃
- `Avatar`: 프로필 이미지
- `Snackbar`, `Alert`: 알림
- `Accordion`: 아코디언 (GitHub 탭)
- `Chip`: 태그/라벨
- `CircularProgress`: 로딩 인디케이터
- `Box`, `Stack`, `Typography`: 레이아웃

### 3.3 상태 관리
- **Context API**: 전역 상태 관리
  - `AuthContext`: 사용자 인증 상태
  - `ProjectContext`: 프로젝트 목록 및 현재 프로젝트 상태
- **Local Storage**: 토큰 및 사용자 정보 저장
- **useState, useEffect**: 컴포넌트 로컬 상태

## 4. 라우팅 구조

### 4.1 라우트 정의 (`App.jsx`)

#### 공개 라우트 (GuestRoute)
- `/login`: 로그인 페이지
- `/signup`: 회원가입 페이지
- `/`: 메인으로 리다이렉트

#### 보호 라우트 (ProtectedRoute)
- `/main`: 메인 대시보드 (할당된 작업 표시)
- `/project`: 프로젝트 목록
- `/project/:id`: 프로젝트 상세 페이지
- `/project/:projectId/commit/:commitSha`: 커밋 상세 페이지
- `/settings`: 설정 페이지
- `/aiadvisor`: AI 어드바이저
- `/ai-next-step`: AI 다음 단계
- `/normal-next-step`: 일반 다음 단계
- `/dev/projects`: 개발자 프로젝트 페이지

### 4.2 라우트 보호
- `ProtectedRoute`: 로그인한 사용자만 접근 가능
- `GuestRoute`: 비로그인 사용자만 접근 가능 (로그인 시 `/main`으로 리다이렉트)

## 5. 상태 관리 (Context API)

### 5.1 AuthContext (`context/AuthContext.jsx`)

**제공하는 상태:**
- `user`: 현재 로그인한 사용자 정보
- `loading`: 인증 상태 로딩 여부
- `setUser`: 사용자 정보 업데이트 함수

**주요 기능:**
- 로그인/로그아웃 상태 관리
- Local Storage에서 토큰 및 사용자 정보 읽기/저장
- 페이지 새로고침 시 인증 상태 복원

**사용 예시:**
```javascript
import { useAuthContext } from "./context/AuthContext";

function MyComponent() {
  const { user, loading, setUser } = useAuthContext();
  // ...
}
```

### 5.2 ProjectContext (`context/ProjectContext.jsx`)

**제공하는 상태:**
- `projects`: 프로젝트 목록
- `currentProject`: 현재 선택된 프로젝트
- `loading`: 프로젝트 로딩 여부
- `isOwner`: 현재 사용자가 프로젝트 오너인지 여부

**제공하는 함수:**
- `updateProjectGithub(projectId, githubRepo)`: GitHub 저장소 정보 업데이트
- `updateProjectTitle(projectId, title)`: 프로젝트 제목 업데이트
- `updateProjectMembers(projectId, members)`: 멤버 목록 업데이트
- `updateProjectInContext(project)`: 프로젝트 정보 전체 업데이트

**주요 기능:**
- 사용자가 참여한 프로젝트 목록 관리
- 프로젝트 정보 자동 동기화
- 프로젝트 멤버 정보 관리

**사용 예시:**
```javascript
import { useProject } from "./context/ProjectContext";

function MyComponent() {
  const { projects, currentProject, isOwner, updateProjectGithub } = useProject();
  // ...
}
```

## 6. API 통신

### 6.1 API 구조

모든 API 호출은 `api/` 디렉토리에 정의되어 있으며, `axios`를 사용합니다.

**공통 설정:**
- Base URL: `http://localhost:5000/api`
- 인증: `Authorization: Bearer <token>` 헤더 자동 추가
- 에러 처리: 공통 에러 핸들러

### 6.2 주요 API 모듈

#### `api/projects.js`
- `getProjects(projectId?)`: 프로젝트 목록/상세 조회
- `createProject(data)`: 프로젝트 생성
- `updateProject(projectId, data)`: 프로젝트 수정
- `deleteProject(projectId)`: 프로젝트 삭제
- `joinProject(projectCode, password)`: 프로젝트 참여
- `getMembers(projectId)`: 프로젝트 멤버 조회
- `connectGithubRepo(projectId, githubRepo, githubToken)`: GitHub 저장소 연결

#### `api/task.js` / `api/taskApi.js`
- `getTasks(projectId, taskId?)`: 작업 목록/상세 조회
- `createTask(data)`: 작업 생성
- `updateTask(taskId, data)`: 작업 수정
- `updateTaskStatus(taskId, status)`: 작업 상태 수정
- `assignTask(taskId, userId)`: 작업 할당
- `deleteTask(taskId)`: 작업 삭제

#### `api/githubApi.js`
- `syncGitHub(projectId)`: GitHub 정보 동기화
- `getCommits(projectId)`: 커밋 목록 조회
- `getCommit(projectId, commitSha)`: 커밋 상세 조회
- `getIssues(projectId)`: 이슈 목록 조회
- `getIssue(projectId, issueNumber)`: 이슈 상세 조회
- `getBranches(projectId)`: 브랜치 목록 조회
- `getBranch(projectId, branchName)`: 브랜치 상세 조회

### 6.3 인증 처리 (`utils/auth.js`)

**주요 함수:**
- `login(email, password)`: 로그인
- `signup(data)`: 회원가입
- `logout()`: 로그아웃 (Local Storage 정리)
- `getUser()`: 저장된 사용자 정보 조회
- `updateUser(data)`: 사용자 정보 업데이트
- `deleteUser()`: 회원 탈퇴

**토큰 관리:**
- 로그인 시 토큰을 Local Storage에 저장
- API 호출 시 자동으로 헤더에 포함
- 로그아웃 시 Local Storage에서 삭제

## 7. 주요 컴포넌트

### 7.1 GitHub 관련 컴포넌트

#### `ProjectGitHubTab.jsx`
- GitHub 탭 메인 컴포넌트
- 저장소 연결/수정 기능
- 동기화 버튼
- 아코디언으로 이슈/브랜치/커밋 목록 표시

**주요 기능:**
- GitHub 저장소 URL 및 토큰 입력
- 토큰 저장 및 기존 토큰 유지 기능
- 동기화 실행 및 결과 표시

#### `CommitList.jsx`
- 커밋 목록 표시
- 커밋 클릭 시 상세 페이지로 이동 (`/project/:projectId/commit/:commitSha`)

#### `BranchList.jsx`
- 브랜치 목록 표시
- 기본 브랜치 및 보호된 브랜치 표시

#### `IssueList.jsx`
- 이슈 목록 표시
- 이슈 본문 전체 표시 (100자 제한 없음)
- 라벨 및 상태 표시

#### `DiffViewer.jsx`
- 코드 diff 시각화
- 추가/삭제/수정 라인 구분 표시

### 7.2 프로젝트 관련 컴포넌트

#### `ProjectDetailTabs.jsx`
- 프로젝트 상세 페이지의 탭 관리
- 탭: "상세 정보", "작업 목록", "GitHub"

#### `ProjectCard.jsx`
- 프로젝트 카드 컴포넌트
- 프로젝트 멤버 아바타 표시
- 프로필 이미지 캐시 버스팅 지원

#### `ProjectTaskList.jsx`
- 프로젝트의 작업 목록 표시
- 작업 추가/수정/삭제 기능

### 7.3 공통 UI 컴포넌트

#### `Header.jsx`
- 상단 헤더
- 프로젝트 목록 메뉴
- 설정/프로필 링크

#### `NavBar.jsx`
- 하단 네비게이션 바
- Home, Project, AI Advisor, Settings 링크

#### `EditProfileModal.jsx`
- 프로필 수정 모달
- 닉네임, 비밀번호 수정
- 프로필 이미지 업로드
- 이메일은 수정 불가 (disabled)

## 8. 주요 페이지

### 8.1 `MainPage.jsx`
- 메인 대시보드
- 사용자에게 할당된 작업 표시
- 프로젝트별로 그룹화하여 표시
- 프로필 업데이트 시 자동 새로고침

### 8.2 `ProjectPage.jsx`
- 프로젝트 목록 페이지
- 프로젝트 생성/참여 기능
- 프로젝트 카드 클릭 시 상세 페이지로 이동

### 8.3 `ProjectDetailPage.jsx`
- 프로젝트 상세 페이지
- `ProjectDetailTabs` 컴포넌트 사용
- 탭: 상세 정보, 작업 목록, GitHub

### 8.4 `CommitDetailPage.jsx`
- 커밋 상세 페이지
- 커밋 메시지, 작성자, 날짜 표시
- 통계 정보 (추가/삭제된 라인, 변경된 파일 수)
- 파일별 변경 내역 (DiffViewer 사용)
- "프로젝트로 돌아가기" 버튼

### 8.5 `SettingsPage.jsx`
- 설정 페이지
- 프로필 수정 모달
- 회원 탈퇴 기능
- 프로필 이미지 표시 (캐시 버스팅)

## 9. 유틸리티 함수

### 9.1 `utils/profileImage.js`

**`getProfileImageSrc(profileImage, useCacheBust)`**
- 프로필 이미지 경로 생성
- Blob URL 처리 (미리보기용)
- 캐시 버스팅 지원 (타임스탬프 추가)

**사용 예시:**
```javascript
import { getProfileImageSrc } from "../utils/profileImage";

<Avatar src={getProfileImageSrc(user.profileImage, true)} />
```

### 9.2 `utils/auth.js`

**주요 함수:**
- `login(email, password)`: 로그인 API 호출
- `signup(data)`: 회원가입 API 호출
- `logout()`: 로그아웃 (Local Storage 정리)
- `getUser()`: 저장된 사용자 정보 조회
- `updateUser(data)`: 사용자 정보 업데이트
- `deleteUser()`: 회원 탈퇴 API 호출

## 10. 주요 기능 및 특징

### 10.1 프로필 이미지 관리
- 프로필 이미지 업로드/삭제
- Blob URL을 사용한 미리보기
- 캐시 버스팅으로 최신 이미지 표시
- 프로젝트 멤버 목록에 프로필 이미지 반영

### 10.2 GitHub 연동
- GitHub 저장소 연결 및 토큰 저장
- 토큰 기존 값 유지 기능 (빈 문자열 입력 시)
- 동기화 기능
- 커밋/브랜치/이슈 목록 표시
- 커밋 상세 페이지 (페이지 이동)

### 10.3 프로젝트 관리
- 프로젝트 생성 (공유/비공유 선택)
- 프로젝트 코드로 참여
- 프로젝트 멤버 관리
- 프로젝트 정보 수정 (owner만)

### 10.4 작업 관리
- 작업 생성/수정/삭제
- 작업 상태 변경 (todo, in_progress, done, cancelled)
- 작업 할당
- 프로젝트별 작업 목록 표시

### 10.5 상태 동기화
- 프로필 수정 시 프로젝트 멤버 목록 자동 업데이트
- 프로젝트 정보 변경 시 Context 자동 업데이트
- 페이지 포커스 시 프로젝트 목록 자동 새로고침

## 11. 스타일링

### 11.1 Material-UI (MUI)
- 기본 UI 컴포넌트는 MUI 사용
- `sx` prop으로 스타일링
- 테마 설정 (`theme.js`)

### 11.2 반응형 디자인
- 모바일 우선 설계
- MUI의 반응형 유틸리티 사용
- 아코디언을 사용한 GitHub 탭 (모바일 친화적)

## 12. 보안 고려사항

### 12.1 인증
- JWT 토큰을 Local Storage에 저장
- API 호출 시 자동으로 헤더에 포함
- ProtectedRoute로 보호된 페이지 접근 제어

### 12.2 데이터 보안
- GitHub 토큰은 입력 필드에 마스킹 표시 (`••••••••••••••••`)
- 프로필 이미지 캐시 버스팅으로 최신 이미지 보장
- 이메일 수정 불가 (disabled)

### 12.3 에러 처리
- API 에러 시 사용자에게 알림 표시
- 네트워크 에러 처리
- 로딩 상태 표시

## 13. 성능 최적화

### 13.1 상태 관리
- Context API로 전역 상태 관리
- 불필요한 리렌더링 방지 (useCallback, useMemo)
- 프로젝트 정보 자동 동기화

### 13.2 이미지 최적화
- 프로필 이미지 캐시 버스팅
- Blob URL 메모리 관리 (revokeObjectURL)

### 13.3 코드 분할
- React Router의 코드 분할 (필요 시)
- 동적 import 사용 (필요 시)

## 14. 개발 환경

### 14.1 실행 방법
```bash
cd morpheus-react/web
npm install
npm start
```

### 14.2 빌드
```bash
npm run build
```

### 14.3 환경 변수
- 개발 서버: `http://localhost:5173`
- API 서버: `http://localhost:5000`

## 15. 구현 상태

### ✅ 구현 완료된 기능

**인증 (4개 페이지)**
- ✅ 로그인 페이지
- ✅ 회원가입 페이지
- ✅ 프로필 수정 (모달)
- ✅ 회원 탈퇴

**프로젝트 관리 (3개 페이지)**
- ✅ 프로젝트 목록 페이지
- ✅ 프로젝트 상세 페이지 (탭: 상세/작업/GitHub)
- ✅ 프로젝트 생성/참여

**작업 관리 (1개 페이지)**
- ✅ 작업 목록/추가/수정/삭제
- ✅ 작업 상태 변경
- ✅ 작업 할당

**GitHub 연동 (2개 페이지)**
- ✅ GitHub 탭 (이슈/브랜치/커밋 목록)
- ✅ 커밋 상세 페이지

**기타 (3개 페이지)**
- ✅ 메인 대시보드 (할당된 작업 표시)
- ✅ 설정 페이지
- ✅ AI 어드바이저 페이지

**총 13개 페이지 구현 완료** ✅

