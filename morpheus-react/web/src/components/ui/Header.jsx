import React, { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Collapse from "@mui/material/Collapse";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import { getHeaderMenuItems } from "../../constants/headerMenu";

export default function Header({ title = "Todo App", isBlur = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const menuItems = getHeaderMenuItems(navigate);

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
          <Typography variant="h6">{title}</Typography>
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={() => setOpen((prev) => !prev)}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Collapse in={open}>
        <Box sx={{ bgcolor: "common.white", p: 2 }}>
          {menuItems.map((item, idx) => (
            <Button
              key={idx}
              fullWidth
              sx={{
                mb: 1,
                color: "text.primary",
                border: "none",
                bgcolor: "common.white",
                boxShadow: "none",
                "&:hover": { bgcolor: "grey.100" },
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
