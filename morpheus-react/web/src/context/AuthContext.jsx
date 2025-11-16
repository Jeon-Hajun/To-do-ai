// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loginUser, fetchCurrentUser } from "../api/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  console.log('[AuthProvider] 렌더링 시작');
  
  try {
    const queryClient = useQueryClient();
    console.log('[AuthProvider] queryClient 가져옴');
    
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    console.log('[AuthProvider] 상태 초기화 완료');

    // 초기화: localStorage에서 토큰 읽기
    useEffect(() => {
      console.log('[AuthProvider] 초기화 useEffect 실행');
      const localToken = localStorage.getItem("token");
      console.log('[AuthProvider] localStorage 토큰:', localToken ? '있음' : '없음');
      
      if (localToken) {
        setToken(localToken);
        console.log('[AuthProvider] 사용자 정보 가져오기 시작');
        fetchCurrentUser(localToken)
          .then(res => {
            console.log('[AuthProvider] 사용자 정보 가져오기 성공:', res.data);
            setUser(res.data);
          })
          .catch((err) => {
            console.error('[AuthProvider] 사용자 정보 가져오기 실패:', err);
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
          })
          .finally(() => {
            console.log('[AuthProvider] 로딩 완료');
            setIsLoading(false);
          });
      } else {
        console.log('[AuthProvider] 토큰 없음, 로딩 완료');
        setIsLoading(false);
      }
    }, []);

    // 로그인
    const login = async (email, password) => {
      const res = await loginUser(email, password);
      if (res.success) {
        localStorage.setItem("token", res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
      return res;
    };

    // 로그아웃
    const logout = () => {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      queryClient.clear(); // React Query 캐시도 초기화
    };

    console.log('[AuthProvider] Provider 렌더링');
    return (
      <AuthContext.Provider value={{ user, token, login, logout, isLoading, setUser }}>
        {children}
      </AuthContext.Provider>
    );
  } catch (error) {
    console.error('[AuthProvider] 에러 발생:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>AuthProvider 에러 발생</h1>
        <pre>{error.toString()}</pre>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}
export const useAuthContext = () => useContext(AuthContext);
export function useAuth() {
  return useContext(AuthContext);
}
