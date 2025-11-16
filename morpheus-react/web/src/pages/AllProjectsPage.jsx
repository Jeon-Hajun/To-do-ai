import React, { useState } from "react";
import {
  Box,
  TextField,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllSharedProjects, joinProject } from "../api/projects";
import { Header, ContainerBox } from "../components/layout/index.js";

export default function AllProjectsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // 전체 공유 프로젝트 목록 조회
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["allSharedProjects"],
    queryFn: fetchAllSharedProjects,
  });

  // 프로젝트 참여 mutation
  const joinMutation = useMutation({
    mutationFn: ({ projectId, password }) => joinProject({ projectId, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["allSharedProjects"] });
      setSelectedProject(null);
      setPassword("");
      setPasswordError("");
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "프로젝트 참여에 실패했습니다.";
      setPasswordError(errorMessage);
    },
  });

  // 검색 필터링
  const filteredProjects = projects.filter((project) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = project.title?.toLowerCase().includes(query);
    const ownerMatch =
      project.ownerNickname?.toLowerCase().includes(query) ||
      project.ownerEmail?.toLowerCase().includes(query);
    return titleMatch || ownerMatch;
  });

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setPassword("");
    setPasswordError("");
  };

  const handleJoin = () => {
    if (!selectedProject) return;
    setPasswordError("");
    joinMutation.mutate({
      projectId: selectedProject.id,
      password: password || undefined,
    });
  };

  const handleCloseDialog = () => {
    setSelectedProject(null);
    setPassword("");
    setPasswordError("");
  };

  return (
    <ContainerBox sx={{ pb: 8 }}>
      <Header title="프로젝트 참여" />
      
      <Box sx={{ px: 2, pt: 3 }}>
        {/* 검색 바 */}
        <TextField
          fullWidth
          placeholder="프로젝트명 또는 소유자로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {/* 로딩 */}
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* 프로젝트 목록 */}
        {!isLoading && filteredProjects.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {searchQuery
                ? "검색 결과가 없습니다."
                : "참여 가능한 공유 프로젝트가 없습니다."}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 2,
          }}
        >
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              sx={{
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
              onClick={() => handleProjectClick(project)}
            >
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  {project.title}
                </Typography>
                {project.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, minHeight: 40 }}
                  >
                    {project.description.length > 100
                      ? `${project.description.substring(0, 100)}...`
                      : project.description}
                  </Typography>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    소유자: {project.ownerNickname || project.ownerEmail}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    멤버 수: {project.memberCount}명
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* 비밀번호 입력 모달 */}
      <Dialog
        open={!!selectedProject}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedProject?.title} 참여하기
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            {passwordError && (
              <Alert severity="error">{passwordError}</Alert>
            )}
            <TextField
              label="비밀번호 (공유 프로젝트용)"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              fullWidth
              placeholder="비밀번호가 설정된 경우 입력해주세요"
              disabled={joinMutation.isPending}
            />
            <Typography variant="caption" color="text.secondary">
              소유자: {selectedProject?.ownerNickname || selectedProject?.ownerEmail}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={joinMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleJoin}
            variant="contained"
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? <CircularProgress size={20} /> : "참여하기"}
          </Button>
        </DialogActions>
      </Dialog>
    </ContainerBox>
  );
}

