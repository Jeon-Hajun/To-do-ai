import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

export default function TaskItem({ task }) {
  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="body1">{task.title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {task.dueDate}
      </Typography>
    </Paper>
  );
}
