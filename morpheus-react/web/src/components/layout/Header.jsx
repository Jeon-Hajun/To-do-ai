import React, { useState } from "react";
import { AppBar, Toolbar, Typography, IconButton, Collapse, Box, Button } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useProjects } from "../../hooks/useProjects";

export default function Header({ title = "PM to the AM", isBlur = false }) {
  // Header 컴포넌트를 빈 컴포넌트로 변경 (토글 버튼과 텍스트 제거)
  return null;
}

