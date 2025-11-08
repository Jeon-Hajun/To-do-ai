// src/api/taskApi.js

// TODO: 서버 연동 시 axios 적용 예정
// import axios from "axios";
// const API = axios.create({ baseURL: "/api" });

import * as taskStorage from "./storage/taskStorage";

export async function getTasks() {
  return new Promise((resolve) => 
    setTimeout(() => resolve(taskStorage.getTasks()), 300)
  );
}

export async function addTask(task) {
  return new Promise((resolve) => 
    setTimeout(() => resolve(taskStorage.addTask(task)), 300)
  );
}

export async function deleteTask(id) {
  return new Promise((resolve) => 
    setTimeout(() => {
      taskStorage.deleteTask(id);
      resolve();
    }, 300)
  );
}

export async function updateTaskStatus(id, status) {
  return new Promise((resolve, reject) => 
    setTimeout(() => {
      const updated = taskStorage.updateTaskStatus(id, status);
      updated ? resolve(updated) : reject(new Error("Task not found"));
    }, 300)
  );
}
