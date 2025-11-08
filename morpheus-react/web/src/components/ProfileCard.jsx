// src/components/ProfileCard.jsx
import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { getUser } from "../utils/auth";

export default function ProfileCard() {
  const user = getUser();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{user?.name || "사용자 이름"}</Typography>
        <Typography color="text.secondary">{user?.email || "이메일"}</Typography>
      </CardContent>
    </Card>
  );
}
