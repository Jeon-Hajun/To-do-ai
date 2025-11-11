import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { getUser, setAuth, logout as localLogout } from "../utils/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 서버에서 사용자 정보 가져오기
  const fetchUserFromServer = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get("http://localhost:5000/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 서버에서 가져온 사용자 정보를 user로 설정
      setUser(res.data.data); 
      setAuth(res.data.data); // localStorage에도 저장
    } catch (err) {
      console.error("Failed to fetch user info:", err);
      localLogout();
      setUser(null);
    }
  };

  useEffect(() => {
    const savedUser = getUser();
    if (savedUser) {
      setUser(savedUser);
      fetchUserFromServer(); // 서버 정보 최신화
    } else {
      fetchUserFromServer();
    }
    setLoading(false);
  }, []);

  const login = async (token) => {
    localStorage.setItem("token", token);
    await fetchUserFromServer();
  };

  const logout = () => {
    localLogout();
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
