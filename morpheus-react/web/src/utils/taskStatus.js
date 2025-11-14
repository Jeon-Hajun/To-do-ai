/**
 * Task 상태 값 변환 유틸리티
 * 한글 상태 값을 영문 상태 값으로 변환
 */

// 한글 -> 영문 매핑
const statusMap = {
  "대기 중": "todo",
  "대기": "todo",
  "todo": "todo",
  "진행 중": "in_progress",
  "진행중": "in_progress",
  "in_progress": "in_progress",
  "완료": "done",
  "done": "done",
  "취소됨": "cancelled",
  "취소": "cancelled",
  "cancelled": "cancelled",
};

// 영문 -> 한글 매핑 (표시용)
const statusDisplayMap = {
  todo: "대기 중",
  in_progress: "진행 중",
  done: "완료",
  cancelled: "취소됨",
};

/**
 * 상태 값을 영문 값으로 정규화
 * @param {string} status - 상태 값 (한글 또는 영문)
 * @returns {string} 정규화된 영문 상태 값
 */
export const normalizeStatus = (status) => {
  if (!status) return "todo";
  const normalized = statusMap[status] || status.toLowerCase();
  // 매핑에 없으면 원본 반환 (이미 영문일 수 있음)
  return normalized || "todo";
};

/**
 * 영문 상태 값을 한글 표시용으로 변환
 * @param {string} status - 영문 상태 값
 * @returns {string} 한글 표시 값
 */
export const getStatusDisplay = (status) => {
  if (!status) return "대기 중";
  const normalized = normalizeStatus(status);
  return statusDisplayMap[normalized] || status;
};

/**
 * 유효한 상태 값인지 확인
 * @param {string} status - 확인할 상태 값
 * @returns {boolean} 유효한 상태 값인지 여부
 */
export const isValidStatus = (status) => {
  const normalized = normalizeStatus(status);
  return ["todo", "in_progress", "done", "cancelled"].includes(normalized);
};



