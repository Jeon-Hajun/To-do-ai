import React, { useState, useEffect } from "react";
import Card from "./ui/Card";
import { getTasks } from "../api/taskApi";

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, pending: 0 });

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getTasks();
      setTasks(data);

      // 상태별 통계 계산
      const total = data.length;
      const completed = data.filter((t) => t.status === "완료").length;
      const inProgress = data.filter((t) => t.status === "진행 중").length;
      const pending = data.filter((t) => t.status === "대기 중").length;

      setStats({ total, completed, inProgress, pending });
    };

    fetchTasks();
  }, []);

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 통계 카드 */}
      <Card className="bg-blue-50">
        <h3 className="text-lg font-bold mb-2">Task 통계</h3>
        <p>총 작업: {stats.total}</p>
        <p>완료: {stats.completed}</p>
        <p>진행 중: {stats.inProgress}</p>
        <p>대기 중: {stats.pending}</p>
        {stats.total > 0 && (
          <p className="mt-2 font-semibold">
            진행률: {Math.round((stats.completed / stats.total) * 100)}%
          </p>
        )}
      </Card>

      {/* Task 카드 */}
      {tasks.map((task) => (
        <Card key={task.id} className="hover:shadow-lg transition">
          <h2 className="text-lg font-bold mb-2">{task.title}</h2>
          <p className="text-gray-600 mb-2">{task.description}</p>
          <span
            className={`text-sm font-semibold ${
              task.status === "완료"
                ? "text-green-600"
                : task.status === "진행 중"
                ? "text-blue-600"
                : "text-gray-400"
            }`}
          >
            {task.status}
          </span>
        </Card>
      ))}
    </div>
  );
}
