// src/components/ui/NavBar.jsx
import React from "react";
import Box from "@mui/material/Box";
import NavButtonGroup from "./NavButtonGroup";
import { navButtons } from "../../constants/navButtons";

export default function NavBar({ buttons }) {
  const buttonList = buttons || navButtons;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        bgcolor: "background.paper",
        boxShadow: 3,
        p: 0,  // 좌우 여백 제거
      }}
    >
      <NavButtonGroup buttons={buttonList} />
    </Box>
  );
}
