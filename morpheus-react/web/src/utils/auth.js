// 기존 함수들
export function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function getToken() {
  return localStorage.getItem("token");
}

export function isAuth() {
  return !!getToken() || !!getUser();
}

export function setAuth(user, token) {
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
  if (token) {
    localStorage.setItem("token", token);
  }
}

export function logout() {
  // 토큰과 사용자 정보 모두 삭제
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login"; // 로그인 페이지로 이동
}

// 임시 로그인용 (개발용 테스트 계정)
export function fakeLogin(email, password) {
  // 임시 계정: test@test.com / 1234
  if (email === "test@test.com" && password === "1234") {
    setAuth({ email });
    return true;
  }
  return false;
}
