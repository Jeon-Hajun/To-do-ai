// src/components/SignupForm.jsx
import React, { useState } from "react";
import SignupButton from "../ui/SignupButton";

export default function SignupForm({ onSignupSuccess }) {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        type="text"
        placeholder="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
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
      <input
        type="password"
        placeholder="비밀번호 확인"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        className="border p-2 rounded"
      />

      {/* 비밀번호 확인 로직 */}
      {password !== confirmPassword && password && confirmPassword && (
        <div style={{ color: "red", fontSize: "0.9rem" }}>비밀번호가 일치하지 않습니다.</div>
      )}

      <SignupButton
        email={email}
        password={password}
        nickname={nickname}
        onSignupSuccess={onSignupSuccess}
      />
    </form>
  );
}
