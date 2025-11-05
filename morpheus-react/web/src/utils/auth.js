// 기존 함수들
export function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function isAuth() {
  return !!getUser();
}

export function setAuth(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function logout() {
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
