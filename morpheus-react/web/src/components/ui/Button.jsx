// src/components/ui/Button.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function Button({
  children,
  className = "",
  type = "default",   // default | select | back
  selected = false,   // select 버튼이면 선택 여부
  ...props
}) {
  const navigate = useNavigate();

  // 기본 스타일
  let baseClasses = "py-2 px-4 rounded-md transition-colors flex items-center justify-center ";

  if (type === "default") {
    baseClasses += "bg-black text-white hover:bg-gray-800 ";
  } else if (type === "select") {
    baseClasses += selected
      ? "bg-blue-600 text-white hover:bg-blue-700 "
      : "bg-gray-200 text-black hover:bg-gray-300 ";
  } else if (type === "back") {
    baseClasses += "bg-gray-400 text-white hover:bg-gray-500 ";
  }

  // onClick 기본 동작: 뒤로가기 버튼이면 navigate(-1)
  const handleClick = (e) => {
    if (type === "back") {
      navigate(-1);
    }
    if (props.onClick) props.onClick(e);
  };

  return (
    <button className={`${baseClasses} ${className}`} {...props} onClick={handleClick}>
      {children}
    </button>
  );
}
