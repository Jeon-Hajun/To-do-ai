import React from "react";
import { Box } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Navbar, { APPBAR_HEIGHT, APPBAR_HEIGHT_MOBILE, BOTTOM_NAV_HEIGHT } from "./NavBar";
import { isMobile as detectMobile, isTablet as detectTablet } from "react-device-detect";


export default function Layout({ children }) {
  const isMobileDevice = detectMobile;
  const isTabletDevice = detectTablet;
  const isMobileLayout = isMobileDevice || isTabletDevice;

  const topBarHeight = isMobileLayout ? APPBAR_HEIGHT_MOBILE : APPBAR_HEIGHT;
  const bottomBarHeight = isMobileLayout ? BOTTOM_NAV_HEIGHT : 0;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navbar에 기기 정보 전달 */}
      <Navbar isMobileLayout={isMobileLayout} />

      <Box
        component="main"
        sx={{
          flex: 1,
          mt: `${topBarHeight}px`,    // PC/모바일 상관없이 top margin 적용
          pb: `${bottomBarHeight}px`, // 모바일/태블릿이면 하단 Nav padding 적용
          width: "100%",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}