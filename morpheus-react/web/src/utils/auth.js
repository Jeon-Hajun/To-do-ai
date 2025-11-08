// src/utils/auth.js
import axios from "axios";

const API_URL = "http://localhost:3000/api/user";

// 로컬 스토리지에서 유저 정보 가져오기
export function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// 로그인 성공 시 유저 정보 저장
export function setAuth(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

// 로그아웃
export function logout() {
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
