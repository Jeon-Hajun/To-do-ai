import { useQuery } from "@tanstack/react-query";
import { fetchTasksByProject, fetchTaskDetail } from "../api/tasks";


/**
 * 특정 프로젝트의 전체 작업 목록을 가져오는 React Query Hook
 */
export function useProjectTasks(projectId) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => getTasksByProject(projectId),
    enabled: !!projectId, // projectId가 있을 때만 실행
  });
}

/**
 * 특정 작업 상세 정보를 가져오는 React Query Hook
 */
export function useTaskDetail(taskId) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTaskDetail(taskId),
    enabled: !!taskId, // taskId가 있을 때만 실행
  });
}
