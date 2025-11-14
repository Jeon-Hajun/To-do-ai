/**
 * 프로필 이미지 경로 생성 유틸리티
 * blob URL과 일반 파일명을 구분하여 올바른 경로를 반환합니다.
 * 
 * @param {string} profileImage - 프로필 이미지 파일명 또는 blob URL
 * @param {boolean} useCacheBust - 캐시 무효화를 위한 timestamp 추가 여부 (기본값: false)
 * @returns {string} 프로필 이미지 경로
 */
export function getProfileImageSrc(profileImage, useCacheBust = false) {
  if (!profileImage) {
    return `/profile/basic.png`;
  }
  
  // blob URL인 경우 그대로 사용
  if (profileImage.startsWith('blob:')) {
    return profileImage;
  }
  
  // 일반 파일명인 경우
  const basePath = `/profile/${profileImage}`;
  return useCacheBust ? `${basePath}?t=${Date.now()}` : basePath;
}

/**
 * 프로필 이미지 경로를 생성하는 React Hook
 * user 객체에서 profileImage를 추출하여 경로를 반환합니다.
 * 
 * @param {object} user - 사용자 객체
 * @param {boolean} useCacheBust - 캐시 무효화를 위한 timestamp 추가 여부 (기본값: false)
 * @returns {string} 프로필 이미지 경로
 */
export function useProfileImageSrc(user, useCacheBust = false) {
  return getProfileImageSrc(user?.profileImage, useCacheBust);
}



