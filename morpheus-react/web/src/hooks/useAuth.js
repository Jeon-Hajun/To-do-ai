// src/hooks/useAuth.js
import { useEffect, useState } from "react";
import { getUser } from "../utils/auth";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 한 번만 읽기 — re-render를 유발하지 않도록 간단하게 처리
    const loggedUser = getUser();
    setUser(loggedUser || null);
    setLoading(false);
  }, []); // 빈 배열: 마운트 시 딱 한 번만 실행

  return { user, loading };
}
