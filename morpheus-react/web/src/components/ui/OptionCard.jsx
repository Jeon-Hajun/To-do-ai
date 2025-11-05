// src/components/ui/OptionCard.jsx
import React from "react";

export default function OptionCard({ title, description, isSelected }) {
  if (!isSelected) return null; // 선택된 카드만 보여줌

  return (
    <div className="bg-blue-50 border border-blue-300 p-6 rounded-lg shadow-md transition-transform transform hover:scale-105">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p>{description}</p>
    </div>
  );
}
