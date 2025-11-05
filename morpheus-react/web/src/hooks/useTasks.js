// src/hooks/useTasks.js
import { useState } from "react";

export default function useTasks() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "프로젝트 계획 작성", dueDate: "2025-11-10" },
    { id: 2, title: "디자인 시안 검토", dueDate: "2025-11-12" },
  ]);

  const addTask = (title, dueDate) => {
    const newTask = { id: Date.now(), title, dueDate };
    setTasks([...tasks, newTask]);
  };

  return { tasks, addTask };
}
