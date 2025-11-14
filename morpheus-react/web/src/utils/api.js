// src/utils/api.js
import { getToken } from "./auth";

/**
 * 인증 헤더를 생성하는 공통 함수
 * @returns {Object} Authorization 헤더가 포함된 객체
 * @throws {Error} 토큰이 없을 경우 에러 발생
 */
export const getAuthHeader = () => {
  const token = getToken();
  if (!token) throw new Error("토큰이 없습니다. 로그인해주세요.");
  return { Authorization: `Bearer ${token}` };
};



