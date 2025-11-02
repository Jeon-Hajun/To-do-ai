# To-do-ai-agent

To-do app + AI agent project by team Wasabi

기본적인 웹 애플리케이션 개발을 위한 프로젝트 템플릿입니다.

## 프로젝트 구조

```
project/
├── morpheus-react/          # 프론트엔드 (모피어스 리액트)
├── backend/                 # 백엔드 (Node.js + Express)
├── ai-backend/              # AI 백엔드 (Flask)
└── document/                # 문서
```

## 기술 스택

### 프론트엔드
- **모피어스 리액트**: 하이브리드 앱 개발
- **React 19**: UI 라이브러리
- **Vite**: 빌드 도구

### 백엔드
- **Node.js + Express**: REST API 서버
- **SQLite**: 데이터베이스
- **JWT**: 인증

### AI 백엔드
- **Flask**: AI 서비스 서버

## 설치 및 실행

### 1. 프론트엔드 실행

```bash
cd morpheus-react
npm install
npm run dev
```

### 2. 백엔드 실행

```bash
cd backend
npm install
cp env.example .env
# .env 파일에서 설정 수정
npm run dev
```

### 3. AI 백엔드 실행

```bash
cd ai-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
python app.py
```

## API 엔드포인트

### 기본 API
- `GET /` - 서버 상태 확인
- `GET /health` - 헬스 체크

### 사용자 API
- `POST /api/user/join` - 회원가입
- `POST /api/user/login` - 로그인
- `GET /api/user/duplicate` - 아이디 중복 확인
- `GET /api/user/info` - 회원정보 조회

### AI 백엔드 API
- `GET /health` - AI 서버 상태 확인
- `GET /api/test` - 테스트 엔드포인트

## 환경 변수 설정

### Backend (.env)
```
PORT=3000
NODE_ENV=development
DB_PATH=./database/todo.db
JWT_SECRET=your-super-secret-jwt-key-here
AI_BACKEND_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:5173
```

### AI Backend (.env)
```
FLASK_ENV=development
FLASK_DEBUG=True
HOST=0.0.0.0
PORT=5000
```

## 개발 가이드

### 새로운 기능 추가
1. 백엔드: `backend/routes/`에 새 라우트 파일 생성
2. 프론트엔드: `morpheus-react/web/src/`에 컴포넌트 추가
3. AI 기능: `ai-backend/app.py`에 새 엔드포인트 추가

### 데이터베이스 변경
1. `backend/database/init.js`에서 테이블 스키마 수정
2. 마이그레이션 스크립트 작성 (필요시)

## 라이선스

MIT
