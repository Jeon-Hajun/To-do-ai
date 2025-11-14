// src/api/auth.js
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.USER;

// 이메일 중복 확인
export async function checkEmailDuplicate(email) {
  const res = await axios.get(`${API_URL}/duplicate`, {
    params: { email }
  });
  return res.data;
}

// 회원가입
export async function signupUser(email, password, nickname) {
  const res = await axios.post(`${API_URL}/signup`, { email, password, nickname });
  return res.data;
}

export async function loginUser(email, password) {
  const res = await axios.post(`${API_URL}/login`, { email, password });
  return res.data;
}

export async function fetchCurrentUser(token) {
  if (!token) throw new Error("No token provided");
  const res = await axios.get(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}