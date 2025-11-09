import React from "react";
import Box from "@mui/material/Box";
import NavButtonGroup from "./NavButtonGroup";
import { navButtons } from "../../constants/navButtons";
import { useTheme } from "@mui/material/styles";

export default function NavBar({ buttons }) {
  const theme = useTheme();
  const buttonList = buttons || navButtons;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        bgcolor: theme.palette.background.paper, // Theme 기반
        boxShadow: theme.shadows[3],            // Theme 그림자 통일
        p: 0,                                   // 좌우 여백 제거
      }}
    >
      <NavButtonGroup buttons={buttonList} />
    </Box>
  );
}
