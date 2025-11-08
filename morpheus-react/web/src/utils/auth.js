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
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
  if (token) {
    localStorage.setItem("token", token);
  }
}

// 로그아웃
export function logout() {
  // 토큰과 사용자 정보 모두 삭제
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// 회원가입 (서버로 요청)
export async function registerUser(email, nickname, password) {
  try {
    const res = await axios.post(`${API_URL}/signup`, { email, nickname, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
}

// 로그인 (서버로 요청)
export async function loginUser(email, password) {
  try {
    const res = await axios.post(`${API_URL}/login`, { email, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
}
