// src/api/users.js
import axios from "axios";
import { getAuthHeader } from "../utils/api";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.USER || "/api/users";

// 사용자 Tag 추가
export const addUserTag = async (userId, tag) => {
  const res = await axios.post(
    `${API_URL}/${userId}/tags`,
    { tag },
    {
      headers: getAuthHeader(),
      withCredentials: true,
    }
  );
  return res.data;
};

// 사용자 Tag 삭제
export const removeUserTag = async (userId, tag) => {
  const res = await axios.delete(
    `${API_URL}/${userId}/tags/${encodeURIComponent(tag)}`,
    {
      headers: getAuthHeader(),
      withCredentials: true,
    }
  );
  return res.data;
};

// 사용자 Tag 목록 조회
export const getUserTags = async (userId) => {
  const res = await axios.get(`${API_URL}/${userId}/tags`, {
    headers: getAuthHeader(),
    withCredentials: true,
  });
  return res.data.data.tags || [];
};

