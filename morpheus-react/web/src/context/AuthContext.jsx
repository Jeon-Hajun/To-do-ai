// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loginUser, fetchCurrentUser } from "../api/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 초기화: localStorage에서 토큰 읽기
  useEffect(() => {
    const localToken = localStorage.getItem("token");
    if (localToken) {
      setToken(localToken);
      fetchCurrentUser(localToken)
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
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

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuthContext = () => useContext(AuthContext);
export function useAuth() {
  return useContext(AuthContext);
}
