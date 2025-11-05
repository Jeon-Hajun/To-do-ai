// src/components/TaskItem.jsx
import React from "react";

export default function TaskItem({ task }) {
  return (
    <div className="flex justify-between items-center p-2 border-b border-gray-200">
      <span>{task.title}</span>
      <span className="text-sm text-gray-500">{task.dueDate}</span>
    </div>
  );
}
