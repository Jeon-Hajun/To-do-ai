import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Box,
  Button,
  BottomNavigation,
  BottomNavigationAction,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import FolderIcon from "@mui/icons-material/Folder";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SettingsIcon from "@mui/icons-material/Settings";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const APPBAR_HEIGHT = 64;
export const APPBAR_HEIGHT_MOBILE = 56;
export const BOTTOM_NAV_HEIGHT = 56;

export default function Navbar({ isMobileLayout }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bottomNavValue, setBottomNavValue] = useState(location.pathname);

  const navLinks = [
    { label: "Home", path: "/home" },
    { label: "Projects", path: "/projects" },
    { label: "AI Advisor", path: "/aiadvisor" },
    { label: "Settings", path: "/settings" },
  ];

  useEffect(() => {
    setBottomNavValue(location.pathname);
  }, [location.pathname]);

  // 모바일/태블릿 레이아웃
  if (isMobileLayout) {
    return (
      <>
        <AppBar position="fixed">
          <Toolbar sx={{ minHeight: APPBAR_HEIGHT_MOBILE, px: 1 }}>
            <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              sx={{ flexGrow: 1, textAlign: "center", fontWeight: 700 }}
            >
              PM to the AM
            </Typography>
            <Box width={36} />
          </Toolbar>
        </AppBar>

        <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 250 }}>
            <Typography variant="h6" sx={{ p: 2 }}>
              Navigation
            </Typography>
            <Divider />
            <List>
              {navLinks.map((link) => (
                <ListItemButton
                  key={link.path}
                  component={Link}
                  to={link.path}
                  selected={location.pathname === link.path}
                  onClick={() => setDrawerOpen(false)}
                >
                  <ListItemText primary={link.label} />
                </ListItemButton>
              ))}
              <Divider />
              {user ? (
                <ListItemButton onClick={logout}>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              ) : (
                <ListItemButton component={Link} to="/login" onClick={() => setDrawerOpen(false)}>
                  <ListItemText primary="Login" />
                </ListItemButton>
              )}
            </List>
          </Box>
        </Drawer>

        <BottomNavigation
          value={bottomNavValue}
          onChange={(e, newValue) => newValue && navigate(newValue)}
          showLabels
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: "1px solid #ccc",
            bgcolor: "background.paper",
            zIndex: 1200,
          }}
        >
          {navLinks.map((link) => {
            const Icon =
              link.label === "Home"
                ? HomeIcon
                : link.label === "Projects"
                ? FolderIcon
                : link.label === "AI Advisor"
                ? SmartToyIcon
                : SettingsIcon;
            return <BottomNavigationAction key={link.path} label={link.label} value={link.path} icon={<Icon />} />;
          })}
        </BottomNavigation>
      </>
    );
  }

  // PC 레이아웃
  return (
    <AppBar position="fixed">
      <Toolbar sx={{ minHeight: APPBAR_HEIGHT, px: { xs: 1, sm: 2, md: 3 } }}>
        <Box display="flex" gap={2}>
          {navLinks.map((link) => {
            const isSelected = location.pathname === link.path;
            const isDarkMode = theme.palette.mode === "dark";
            // 라이트 모드에서는 primary.dark보다 더 어두운 색상 사용
            const getDarkerColor = (color) => {
              // RGB 값을 추출하고 더 어둡게 만들기
              const hex = color.replace('#', '');
              const r = parseInt(hex.substr(0, 2), 16);
              const g = parseInt(hex.substr(2, 2), 16);
              const b = parseInt(hex.substr(4, 2), 16);
              // 30% 더 어둡게
              const darkerR = Math.max(0, Math.floor(r * 0.7));
              const darkerG = Math.max(0, Math.floor(g * 0.7));
              const darkerB = Math.max(0, Math.floor(b * 0.7));
              return `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
            };
            const selectedColor = isDarkMode 
              ? theme.palette.primary.main 
              : getDarkerColor(theme.palette.primary.dark);
            return (
              <Button
                key={link.path}
                component={Link}
                to={link.path}
                color="inherit"
                sx={{
                  p: 0,
                  minWidth: 80,
                  fontWeight: 700,
                  color: isSelected ? selectedColor : "inherit",
                  bgcolor: "transparent",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                {link.label}
              </Button>
            );
          })}
        </Box>

        {/* 글자 항상 중앙 정렬 */}
        <Typography
          variant="h6"
          sx={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontWeight: 700,
          }}
        >
          PM to the AM
        </Typography>

        <Box display="flex" alignItems="center" gap={1} ml="auto">
          {user ? (
            <>
              <Typography variant="subtitle1">{user.nickname}</Typography>
              <Button color="inherit" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}