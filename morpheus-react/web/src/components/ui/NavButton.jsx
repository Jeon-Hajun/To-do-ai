// src/components/ui/NavButton.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function NavButton({ name, path }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = location.pathname === path;

  return (
    <button
      onClick={() => navigate(path)}
      className={`flex-1 text-center py-2 rounded-md transition-colors ${
        isActive ? "bg-black text-white" : "text-black hover:bg-gray-200"
      }`}
    >
      {name}
    </button>
  );
}
