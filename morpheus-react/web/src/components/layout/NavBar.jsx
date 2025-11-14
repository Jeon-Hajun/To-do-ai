import React from "react";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, useMediaQuery } from "@mui/material";
import { navButtons } from "../../constants/navButtons";

export default function NavBar({ buttons }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const buttonList = buttons || navButtons;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        bgcolor: theme.palette.background.paper,
        boxShadow: theme.shadows[3],
        p: 0,
      }}
    >
      <ToggleButtonGroup
        value={location.pathname}
        exclusive
        onChange={(_, newValue) => newValue && navigate(newValue)}
        fullWidth
        sx={{
          "& .MuiToggleButton-root": {
            border: "none",
            py: isSmallScreen ? 1.2 : 1.5,
            px: isSmallScreen ? 0.5 : 2,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isSmallScreen ? "1.2rem" : "1rem",
            borderRadius: theme.shape.borderRadius,
            textTransform: "none",
            fontWeight: 600,
            color: theme.palette.text.primary,
            "&.Mui-selected": {
              bgcolor: theme.palette.primary.main,
              color: theme.palette.getContrastText(theme.palette.primary.main),
              "&:hover": {
                bgcolor: theme.palette.primary.dark,
              },
            },
            "&:hover": {
              bgcolor: theme.palette.action.hover,
            },
          },
        }}
      >
        {buttonList.map((btn, idx) => {
          const Icon = btn.icon;
          return (
            <ToggleButton key={idx} value={btn.path}>
              {Icon && <Icon sx={{ mr: isSmallScreen ? 0 : 1 }} />}
              {!isSmallScreen && btn.label}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </Box>
  );
}

