import axios from 'axios';
import { getToken } from '../utils/auth';

const API_URL = 'http://localhost:5000/api/project';

export async function getProjects() {
  const token = getToken();
  const res = await axios.get(`${API_URL}/info`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function createProject(data) {
  const token = getToken();
  const res = await axios.post(`${API_URL}/create`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// 프로젝트 참여
export async function joinProject(data) {
  const token = getToken();
  const res = await axios.post(`${API_URL}/join`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// 프로젝트 탈퇴
export async function leaveProject(projectId) {
  const token = getToken();
  const res = await axios.post(`${API_URL}/leave`, { projectId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
