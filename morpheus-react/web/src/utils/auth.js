// src/utils/auth.js
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.USER;

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

// 회원 정보 수정
export async function updateUser({ email, nickname, password, newPassword }) {
  const token = getToken();
  if (!token) throw { error: { message: "로그인이 필요합니다." } };

  try {
    const res = await axios.put(
      `${API_URL}/me`,
      { email, nickname, password, newPassword },
      { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
    );

    // 응답이 없거나 success가 false인 경우 에러 처리
    if (!res.data || res.data.success === false) {
      const errorData = res.data || {};
      throw {
        error: {
          message: errorData.error?.message || errorData.message || "회원 정보 수정 실패"
        }
      };
    }

    // 수정 성공 시 로컬스토리지 업데이트
    if (res.data?.success && res.data.data?.user) {
      const currentUser = getUser() || {};
      setAuth({ ...currentUser, ...res.data.data.user }, token);
    }

    return res.data;
  } catch (err) {
    // axios 에러인 경우
    if (err.response) {
      throw err.response.data || err;
    }
    // 그 외 에러
    throw err;
  }
}

// 회원 탈퇴
export async function deleteUser() {
  const token = getToken();
  if (!token) throw { error: { message: "로그인이 필요합니다." } };

  try {
    const res = await axios.delete(
      `${API_URL}/me`,
      { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
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
