import React from "react";
import MuiCard from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";

export default function Card({
  children,
  title,          
  actions,        
  variant = "elevation",
  elevation = 3,
  sx = {},
  className = "",
  onClick,        // 클릭 이벤트 추가
}) {
  return (
    <MuiCard
      variant={variant}
      elevation={variant === "elevation" ? elevation : 0}
      sx={{ p: 2, borderRadius: 2, cursor: onClick ? "pointer" : "default", ...sx }}
      className={className}
      onClick={onClick} // 클릭 이벤트 전달
    >
      {title && (
        <CardHeader
          title={<Typography variant="h6">{title}</Typography>}
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
