import { useQuery } from "@tanstack/react-query";
import { fetchProjectById, fetchProjectMembers } from "../api/projects";
import { useAuthContext } from "../context/AuthContext";

/**
 * 프로젝트 상세 정보와 멤버를 조회하는 React Query Hook
 * @param {string|number} projectId - 프로젝트 ID
 * @returns {Object} { project, members, isOwner, loading, error }
 */
export function useProjectDetail(projectId) {
  const { user: currentUser } = useAuthContext();

  // 프로젝트 정보 조회
  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorObj,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProjectById(projectId),
    enabled: !!projectId,
  });

  // 프로젝트 멤버 조회
  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorObj,
  } = useQuery({
    queryKey: ["projectMembers", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
  });

  // 로딩 상태
  const loading = projectLoading || membersLoading;

  // 에러 상태
  const error = projectError || membersError ? (projectErrorObj || membersErrorObj) : null;

  // 오너 판단
  const ownerId = project?.ownerId || project?.owner_id;
  const isOwner = currentUser?.id && ownerId
    ? String(currentUser.id) === String(ownerId)
    : false;

  return {
    project,
    members,
    isOwner,
    loading,
    error,
  };
}
