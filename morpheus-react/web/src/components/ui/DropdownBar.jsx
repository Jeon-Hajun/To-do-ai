import React, { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";

export default function DropdownBar({ items = [], title }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      {/* 메뉴 버튼 */}
      <IconButton
        aria-controls={open ? "dropdown-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        sx={{
          color: theme.palette.text.primary, // theme 색상
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* 메뉴 */}
      <Menu
        id="dropdown-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disablePortal
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          "& .MuiPaper-root": {
            borderRadius: theme.shape.borderRadius, // theme radius
            minWidth: 180,
          },
        }}
      >
        {title && (
          <MenuItem disabled sx={{ fontWeight: "bold", color: theme.palette.text.primary }}>
            {title}
          </MenuItem>
        )}
        {items.map((item, idx) => (
          <MenuItem
            key={idx}
            onClick={() => {
              item.onClick?.();
              handleClose();
            }}
            sx={{
              "&:hover": {
                backgroundColor: theme.palette.primary.light,
              },
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
