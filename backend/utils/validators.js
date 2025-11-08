/**
 * 입력 검증 유틸리티
 */

/**
 * 이메일 형식 검증
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: '이메일을 입력해주세요.' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: '올바른 이메일 형식이 아닙니다.' };
  }
  
  if (email.length > 255) {
    return { valid: false, message: '이메일은 255자 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * 비밀번호 검증
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '비밀번호를 입력해주세요.' };
  }
  
  if (password.length > 255) {
    return { valid: false, message: '비밀번호는 255자 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * 닉네임 검증
 */
function validateNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') {
    return { valid: false, message: '닉네임을 입력해주세요.' };
  }
  
  const trimmed = nickname.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: '닉네임을 입력해주세요.' };
  }
  
  if (trimmed.length > 255) {
    return { valid: false, message: '닉네임은 255자 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * 프로젝트 제목 검증
 */
function validateProjectTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, message: '프로젝트 제목을 입력해주세요.' };
  }
  
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: '프로젝트 제목을 입력해주세요.' };
  }
  
  if (trimmed.length > 255) {
    return { valid: false, message: '프로젝트 제목은 255자 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * 프로젝트 설명 검증
 */
function validateProjectDescription(description) {
  if (description === undefined || description === null) {
    return { valid: true }; // 선택 필드
  }
  
  if (typeof description !== 'string') {
    return { valid: false, message: '프로젝트 설명은 문자열이어야 합니다.' };
  }
  
  // TEXT 타입은 최대 65,535 바이트이지만, UTF-8 기준으로 약 21,845자
  // 안전하게 20,000자로 제한
  if (description.length > 20000) {
    return { valid: false, message: '프로젝트 설명은 20,000자 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * GitHub URL 검증
 */
function validateGitHubUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, message: 'GitHub 저장소 주소를 입력해주세요.' };
  }
  
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'GitHub 저장소 주소를 입력해주세요.' };
  }
  
  // GitHub URL 형식: https://github.com/owner/repo 또는 http://github.com/owner/repo
  const githubUrlRegex = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+(?:\/)?$/;
  if (!githubUrlRegex.test(trimmed)) {
    return { valid: false, message: '올바른 GitHub 저장소 URL 형식이 아닙니다. (예: https://github.com/owner/repo)' };
  }
  
  if (trimmed.length > 500) {
    return { valid: false, message: 'GitHub 저장소 주소는 500자 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * 작업 제목 검증
 */
function validateTaskTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, message: '작업 제목을 입력해주세요.' };
  }
  
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: '작업 제목을 입력해주세요.' };
  }
  
  if (trimmed.length > 255) {
    return { valid: false, message: '작업 제목은 255자 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * 작업 설명 검증
 */
function validateTaskDescription(description) {
  if (description === undefined || description === null) {
    return { valid: true }; // 선택 필드
  }
  
  if (typeof description !== 'string') {
    return { valid: false, message: '작업 설명은 문자열이어야 합니다.' };
  }
  
  if (description.length > 20000) {
    return { valid: false, message: '작업 설명은 20,000자 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * 프로젝트 비밀번호 검증 (공유 프로젝트용)
 */
function validateProjectPassword(password) {
  if (password === undefined || password === null || password === '') {
    return { valid: true }; // 선택 필드
  }
  
  if (typeof password !== 'string') {
    return { valid: false, message: '비밀번호는 문자열이어야 합니다.' };
  }
  
  if (password.length < 4) {
    return { valid: false, message: '프로젝트 비밀번호는 최소 4자 이상이어야 합니다.' };
  }
  
  if (password.length > 255) {
    return { valid: false, message: '프로젝트 비밀번호는 255자 이하여야 합니다.' };
  }
  
  return { valid: true };
}

/**
 * 프로젝트 코드 검증
 */
function validateProjectCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: '프로젝트 코드를 입력해주세요.' };
  }
  
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length !== 6) {
    return { valid: false, message: '프로젝트 코드는 6자리여야 합니다.' };
  }
  
  const codeRegex = /^[A-Z0-9]{6}$/;
  if (!codeRegex.test(trimmed)) {
    return { valid: false, message: '프로젝트 코드는 영문 대문자와 숫자만 사용할 수 있습니다.' };
  }
  
  return { valid: true };
}

/**
 * 숫자 ID 검증
 */
function validateId(id, fieldName = 'ID') {
  if (id === undefined || id === null) {
    return { valid: false, message: `${fieldName}를 입력해주세요.` };
  }
  
  const numId = parseInt(id);
  if (isNaN(numId) || numId <= 0) {
    return { valid: false, message: `올바른 ${fieldName}가 아닙니다.` };
  }
  
  return { valid: true, value: numId };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateNickname,
  validateProjectTitle,
  validateProjectDescription,
  validateGitHubUrl,
  validateTaskTitle,
  validateTaskDescription,
  validateProjectPassword,
  validateProjectCode,
  validateId
};

