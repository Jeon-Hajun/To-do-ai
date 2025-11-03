# 로컬 LLM 설정 가이드

## RTX 5090 32GB 추천 모델

### 1. Ollama (가장 추천 - 프로토타입에 최적)

**설치:**
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# 또는 Homebrew (macOS)
brew install ollama
```

**추천 모델:**
- **Qwen2.5:14B** (한국어 지원 우수, 14B 모델로 품질/속도 균형)
  ```bash
  ollama pull qwen2.5:14b
  ```
  
- **Qwen2.5:32B** (더 높은 품질, 32GB VRAM으로 충분히 가능)
  ```bash
  ollama pull qwen2.5:32b
  ```

- **Llama 3.1:70B** (최고 품질, 32GB VRAM으로 양자화 버전 가능)
  ```bash
  ollama pull llama3.1:70b
  ```

**장점:**
- 설치 및 사용이 매우 간단
- OpenAI API 호환 라이브러리 제공
- 자동 GPU 최적화

### 2. vLLM (프로덕션 수준 성능)

**설치:**
```bash
pip install vllm
```

**장점:**
- 매우 빠른 추론 속도
- 배치 처리 최적화
- 프로덕션 환경에 적합

### 3. llama.cpp (C++ 기반, 빠름)

**설치:**
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make
```

## 추천: Ollama + Qwen2.5:14B

프로토타입 개발에는 **Ollama + Qwen2.5:14B** 조합을 강력 추천합니다.

**이유:**
1. 설치 및 설정이 매우 간단 (5분 이내)
2. 한국어 지원이 우수함
3. OpenAI API 호환으로 코드 변경 최소화
4. RTX 5090에서 매우 빠른 응답 속도
5. 14B 모델로 충분한 품질

## 설정 방법

1. Ollama 설치 및 실행
   ```bash
   ollama serve
   ```

2. 모델 다운로드
   ```bash
   ollama pull qwen2.5:14b
   ```

3. Python에서 사용 (OpenAI 호환)
   ```bash
   pip install ollama
   ```

4. 또는 직접 HTTP API 호출 (포트 11434)

## AI 백엔드 코드 수정 필요

Ollama를 사용하려면 `ai-backend/app.py`에서 OpenAI 대신 Ollama를 사용하도록 수정 필요합니다.

