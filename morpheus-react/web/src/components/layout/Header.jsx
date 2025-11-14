import React, { useState } from "react";
import { AppBar, Toolbar, Typography, IconButton, Collapse, Box, Button } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useProjects } from "../../hooks/useProjects";

export default function Header({ title = "PM to the AM", isBlur = false }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // 프로젝트 목록 조회
  const { query } = useProjects();
  const projects = query.data || [];

  // 프로젝트 메뉴 아이템 생성
  const menuItems = projects.map((p) => ({
    label: p.title,
    onClick: () => {
      navigate(`/projects/${p.id}`);
      setOpen(false);
    },
  }));

  return (
    <>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{
          backdropFilter: isBlur ? "blur(4px)" : "none",
          transition: "backdrop-filter 0.3s ease",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>
            {title}
          </Typography>
          <IconButton size="large" edge="end" color="inherit" onClick={() => setOpen((prev) => !prev)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Collapse in={open}>
        <Box
          sx={{
            bgcolor: theme.palette.background.paper,
            p: 2,
          }}
        >
          {menuItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center">
              참여한 프로젝트가 없습니다.
            </Typography>
          ) : (
            menuItems.map((item, idx) => (
              <Button
                key={idx}
                fullWidth
                sx={{
                  mb: 1,
                  color: theme.palette.text.primary,
                  border: "none",
                  bgcolor: theme.palette.background.paper,
                  boxShadow: "none",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": { bgcolor: theme.palette.action.hover },
                }}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
              >
                {item.label}
              </Button>
            ))
          )}
        </Box>
      </Collapse>
    </>
  );
}

