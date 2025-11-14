import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/projects";
import { getToken } from "../utils/auth";

export const useProjects = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["projects"],
    queryFn: api.fetchProjects,
    
  });

  

  const createMutation = useMutation({
    mutationFn: (newProject) => 
      api.createProject(
        {
          title: newProject.title,
          description: newProject.description || null,
          isShared: newProject.isShared || false,
          password: newProject.password || null,
          githubRepo: newProject.githubRepo || null,
        },
        getToken() // 여기서 토큰 가져오기
      ),
    onSuccess: () => queryClient.invalidateQueries(["projects"]),
  });

  const updateMutation = useMutation({
    mutationFn: api.updateProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const joinMutation = useMutation({
    mutationFn: api.joinProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  return { query, createMutation, updateMutation, deleteMutation, joinMutation };
};
