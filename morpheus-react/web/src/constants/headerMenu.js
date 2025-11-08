/**
 * Header 메뉴 아이템 리스트
 * 각 아이템은 label과 클릭 시 수행할 함수(onClick)를 정의
 * navigate는 Header에서 전달받아 사용
 */
export const getHeaderMenuItems = (navigate) => [
  { label: "Settings", onClick: () => navigate("/settings") },
  { label: "Project", onClick: () => navigate("/project") },
  // 메뉴를 추가/삭제할 때는 이곳만 수정하면 됨
];
