import React, { useState } from "react";
import { AppBar, Toolbar, Typography, IconButton, Collapse, Box, Button } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useProject } from "../../context/ProjectContext";

export default function Header({ title = "Todo App", isBlur = false }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { projects } = useProject();

  // 이제 기본 Settings / Project 메뉴는 제거
  const menuItems = [];

  // 사용자가 참여한 모든 프로젝트 메뉴 추가
  projects.forEach((p) => {
    menuItems.push({
      label: p.title,
      onClick: () => navigate(`/project/${p.id}`, { state: { project: p } }),
    });
  });

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
          {menuItems.map((item, idx) => (
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
                "&:hover": { bgcolor: theme.palette.grey[100] },
              }}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Collapse>
    </>
  );
}
