// src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import useForm from "../hooks/useForm";
import { fakeLogin, setAuth, isAuth } from "../utils/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { values, handleChange, resetForm } = useForm({ email: "", password: "" });
  const [error, setError] = useState("");

  // 로그인 상태 체크 -> 로그인 되어 있으면 /main으로 이동
  useEffect(() => {
    if (isAuth()) {
      navigate("/main", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // fakeLogin은 동기 함수
    const loginSuccess = fakeLogin(values.email, values.password);

    if (loginSuccess) {
      setAuth({ email: values.email }); // 로그인 정보 저장
      navigate("/main", { replace: true }); // 로그인 성공 시 이동
    } else {
      setError("The email or password is not valid.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={values.email}
            onChange={handleChange}
            placeholder="put your Email"
          />
          <Input
            label="Password"
            type="password"
            name="password"
            value={values.password}
            onChange={handleChange}
            placeholder="Put your Password"
          />
          <Button className="w-full mt-2" type="submit">Login</Button>
        </form>
      </Card>
    </div>
  );
}
