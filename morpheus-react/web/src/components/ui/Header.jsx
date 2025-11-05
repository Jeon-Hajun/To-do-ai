// src/components/ui/Header.jsx
import React from "react";
import DropdownBar from "./DropdownBar";
import { logout } from "../../utils/auth";
import { useNavigate } from "react-router-dom";

export default function Header({ title = "Todo App" }) {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Profile", onClick: () => navigate("/profile") },
    { label: "Settings", onClick: () => navigate("/settings") },
    { 
      label: "Logout", 
      onClick: () => {
        logout();
        navigate("/login");
      } 
    },
  ];

  return (
    <header className="w-full bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
      {/* 왼쪽 타이틀, 오른쪽 메뉴 사이 여백 */}
      <h1 className="text-xl font-bold mr-4">{title}</h1>  

      {/* 오른쪽 드롭다운 메뉴 */}
      <DropdownBar items={menuItems} />
    </header>
  );
}
