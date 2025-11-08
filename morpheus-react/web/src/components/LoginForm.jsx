// src/components/LoginForm.jsx
import React, { useState } from "react";
import LoginButton from "../ui/LoginButton";

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form className="flex flex-col gap-2 w-80">
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="border p-2 rounded"
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="border p-2 rounded"
      />
      <LoginButton
        email={email}
        password={password}
        onLoginSuccess={() => onLogin && onLogin({ email })}
      />
    </form>
  );
}
