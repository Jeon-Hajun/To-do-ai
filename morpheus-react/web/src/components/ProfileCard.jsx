import React from "react";
import Card from "./ui/Card";
import Typography from "@mui/material/Typography";
import { getUser } from "../utils/auth";

export default function ProfileCard() {
  const user = getUser();

  return (
    <Card
      sx={{
        maxWidth: 450,
        mx: "auto",
        textAlign: "center",
        p: 4,
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {user?.name || "사용자 이름"}
      </Typography>
      <Typography color="text.secondary">
        {user?.email || "이메일"}
      </Typography>
    </Card>
  );
}
