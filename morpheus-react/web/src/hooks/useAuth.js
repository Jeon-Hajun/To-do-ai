import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuth } from "../utils/auth";

export default function useAuth(redirectTo = "/login") {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuth()) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);
}
