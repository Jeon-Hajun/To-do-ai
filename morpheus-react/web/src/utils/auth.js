// src/utils/auth.js
import axios from "axios";

const API_URL = "http://localhost:5000/api/user";

// 로컬 스토리지에서 유저 정보 가져오기
export function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// 로컬 스토리지에서 토큰 가져오기
export function getToken() {
  return localStorage.getItem("token");
}

// 로그인 여부 확인
export function isAuth() {
  return !!getToken() || !!getUser();
}

// 로그인 성공 시 유저 정보 및 토큰 저장
export function setAuth(user, token) {
  if (user) localStorage.setItem("user", JSON.stringify(user));
  if (token) localStorage.setItem("token", token);
}

// 로그아웃
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// 회원가입
export async function registerUser(email, nickname, password) {
  try {
    const res = await axios.post(`${API_URL}/signup`, { email, nickname, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
}

// 로그인
export async function loginUser(email, password) {
  try {
    const res = await axios.post(`${API_URL}/login`, { email, password });
    setAuth(res.data.data.user, res.data.data.token);
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
}

// 회원 정보 수정
export async function updateUser({ email, nickname, password, newPassword }) {
  const token = getToken();
  if (!token) throw { error: { message: "로그인이 필요합니다." } };

  try {
    const res = await axios.put(
      `${API_URL}/me`,
      { email, nickname, password, newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // 수정 성공 시 로컬스토리지 업데이트
    if (res.data?.success && res.data.data?.user) {
      const currentUser = getUser() || {};
      setAuth({ ...currentUser, ...res.data.data.user }, token);
    }

    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
}

// 회원 탈퇴
export async function deleteUser() {
  const token = getToken();
  if (!token) throw { error: { message: "로그인이 필요합니다." } };

  try {
    const res = await axios.delete(
      `${API_URL}/me`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // 탈퇴 성공 시 로컬스토리지 정리
    if (res.data?.success) {
      logout();
    }

    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
}

// ============================================
// 프로젝트 오너인지 확인 (기존 isOwner 함수)
export function isOwner(project) {
  const user = getUser();
  if (!user || !project || !project.ownerId) return false;
  return String(user.id) === String(project.ownerId);
}

// 새로운 범용 함수: 프로젝트 객체에서 ownerId 혹은 owner_id를 자동 처리
export function isProjectOwner(user, project) {
  if (!user || !project) return false;
  const ownerId = project.ownerId ?? project.owner_id;
  return ownerId && String(user.id) === String(ownerId);
}
