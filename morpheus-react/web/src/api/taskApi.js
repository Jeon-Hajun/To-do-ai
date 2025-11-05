// src/api/taskApi.js

let dummyTasks = [
  { id: 1, title: "회의 준비", description: "오늘 회의 자료 준비하기", status: "진행 중" },
  { id: 2, title: "코드 리뷰", description: "PR 확인 및 리뷰 남기기", status: "대기 중" },
  { id: 3, title: "문서 작성", description: "프로젝트 WBS 문서 작성", status: "완료" },
];

export async function getTasks() {
  return new Promise((resolve) => setTimeout(() => resolve(dummyTasks), 300));
}

export async function addTask(newTask) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const task = { id: dummyTasks.length + 1, ...newTask };
      dummyTasks.push(task);
      resolve(task);
    }, 300);
  });
}

export async function deleteTask(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      dummyTasks = dummyTasks.filter((t) => t.id !== id);
      resolve();
    }, 300);
  });
}

export async function updateTaskStatus(id, status) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const task = dummyTasks.find((t) => t.id === id);
      if (task) {
        task.status = status;
        resolve(task);
      } else reject(new Error("Task not found"));
    }, 300);
  });
}
