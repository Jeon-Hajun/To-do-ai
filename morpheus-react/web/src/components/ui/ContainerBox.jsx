import React from "react";
import Box from "@mui/material/Box";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";

/**
 * 페이지 전체를 감싸는 레이아웃 Box
 * - minHeight: 화면 전체
 * - Header + NavBar 높이를 제외하고 남은 영역 flex로 채움
 */
export default function ContainerBox({ children, sx = {}, ...props }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.background.default, // theme 적용
        px: 2,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}

ContainerBox.propTypes = {
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
};
