# GPU 설정 완료 요약

## 현재 상태

### ✅ 완료된 작업
1. **Ollama 서비스 설정 업데이트**
   - `CUDA_VISIBLE_DEVICES=0` 환경변수 추가
   - GPU 디바이스 접근 권한 설정

2. **GPU 하드웨어 확인**
   - RTX 5090 GPU 감지됨 ✅
   - NVIDIA 드라이버 설치됨 (580.105.08) ✅
   - CUDA 라이브러리 설치됨 ✅

### ⚠️ 현재 문제
- **GPU 사용 안 됨**: `size_vram: 0` (CPU로 실행 중)
- **nvidia-smi**: "No devices were found" (권한 문제 가능성)

## 해결 방법

### 방법 1: Ollama를 직접 실행하여 GPU 감지 확인
```bash
# Ollama 서비스 중지
sudo systemctl stop ollama.service

# 직접 실행하여 GPU 감지 확인
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# 다른 터미널에서 테스트
curl http://localhost:11434/api/generate -d '{"model":"qwen2.5:14b","prompt":"test","stream":false}'
```

### 방법 2: GPU 권한 확인 및 수정
```bash
# GPU 디바이스 권한 확인
ls -la /dev/nvidia*

# ollama 사용자를 video 그룹에 추가 (이미 되어 있음)
sudo usermod -aG video ollama

# Ollama 서비스 재시작
sudo systemctl restart ollama.service
```

### 방법 3: Ollama 로그 확인
```bash
# Ollama 로그에서 GPU 관련 메시지 확인
journalctl -u ollama.service -f | grep -i gpu
```

## 예상 원인

1. **권한 문제**: ollama 사용자가 GPU 디바이스에 접근할 수 없음
2. **드라이버 문제**: nvidia-smi가 작동하지 않음
3. **CUDA 경로 문제**: Ollama가 CUDA 라이브러리를 찾지 못함

## 다음 단계

1. Ollama 로그 확인하여 GPU 감지 여부 확인
2. GPU 디바이스 권한 확인 및 수정
3. 필요시 Ollama를 root로 실행 (보안상 권장하지 않음)

## 참고

- Ollama는 기본적으로 GPU를 자동 감지하여 사용합니다
- GPU가 감지되지 않으면 자동으로 CPU로 실행됩니다
- RTX 5090은 충분히 강력하므로 GPU 사용 시 성능이 크게 향상됩니다

