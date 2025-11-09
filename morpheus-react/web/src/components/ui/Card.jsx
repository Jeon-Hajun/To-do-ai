import React from "react";
import MuiCard from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";

export default function Card({
  children,
  title,
  actions,
  variant = "elevation",
  elevation = 3,
  sx = {},
  className = "",
  onClick,
}) {
  const theme = useTheme();

  return (
    <MuiCard
      variant={variant}
      elevation={variant === "elevation" ? elevation : 0}
      sx={{
        p: 2,
        borderRadius: theme.shape.borderRadius, // theme radius
        boxShadow:
          variant === "elevation"
            ? "0 4px 20px rgba(0,0,0,0.08)"
            : "none",
        cursor: onClick ? "pointer" : "default",
        bgcolor: theme.palette.background.paper, // theme 배경
        ...sx,
      }}
      className={className}
      onClick={onClick}
    >
      {title && (
        <CardHeader
          title={
            <Typography
              variant="h6"
              sx={{ color: theme.palette.text.primary }} // theme 색상
            >
              {title}
            </Typography>
          }
        />
      )}
      <CardContent>{children}</CardContent>
      {actions && <CardActions>{actions}</CardActions>}
    </MuiCard>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  actions: PropTypes.node,
  variant: PropTypes.oneOf(["elevation", "outlined"]),
  elevation: PropTypes.number,
  sx: PropTypes.object,
  className: PropTypes.string,
  onClick: PropTypes.func,
};
