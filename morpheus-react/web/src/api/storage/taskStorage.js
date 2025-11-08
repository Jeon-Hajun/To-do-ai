// src/api/storage/taskStorage.js

let tasks = [
  { id: 1, title: "회의 준비", description: "오늘 회의 자료 준비하기", status: "진행 중" },
  { id: 2, title: "코드 리뷰", description: "PR 확인 및 리뷰 남기기", status: "대기 중" },
  { id: 3, title: "문서 작성", description: "프로젝트 WBS 문서 작성", status: "완료" },
];

export function getTasks() {
  return [...tasks];
}

export function addTask(newTask) {
  const task = { id: tasks.length + 1, ...newTask };
  tasks.push(task);
  return task;
}

export function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
}

export function updateTaskStatus(id, status) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  task.status = status;
  return task;
}
