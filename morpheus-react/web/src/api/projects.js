// 임시 참가 프로젝트 저장
let userProjects = []; // 사용자가 참가한 프로젝트 리스트

// 테스트용 봇
const botUsers = [
  { id: "bot1", name: "Bot Alice", avatar: "https://i.pravatar.cc/40?img=1" },
  { id: "bot2", name: "Bot Bob", avatar: "https://i.pravatar.cc/40?img=2" },
  { id: "bot3", name: "Bot Carol", avatar: "https://i.pravatar.cc/40?img=3" },
];

// 실제 존재하는 프로젝트 테스트용
export const allProjects = [
  { id: 1, name: "테스트 프로젝트 A", code: "ABC123", participants: [botUsers[0], botUsers[1]] },
  { id: 2, name: "테스트 프로젝트 B", code: "XYZ789", participants: [botUsers[1], botUsers[2]] },
  { id: 3, name: "테스트 프로젝트 C", code: "LMN456", participants: [botUsers[0], botUsers[2]] },
];

// 참가한 프로젝트 조회
export async function getUserProjects() {
  return userProjects;
}

// 프로젝트 참가
export async function joinProjectByCode(code, userName) {
  const project = allProjects.find((p) => p.code === code);
  if (!project) throw new Error("해당 코드의 프로젝트가 없습니다.");

  // 참가자 객체 생성 (테스트용 사용자)
  const user = { id: `user-${Date.now()}`, name: userName, avatar: `https://i.pravatar.cc/40?u=${Date.now()}` };

  project.participants.push(user);

  // 중복 참가 방지
  if (!userProjects.find((p) => p.id === project.id)) {
    userProjects.push(project);
  }

  return project;
}
