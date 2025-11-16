import React from "react";
import { Typography } from "@mui/material";
import { Header, ContainerBox, PageContainer } from "../components/layout/index.js";

export default function Dashboard() {
  return (
    <ContainerBox sx={{ pb: 8 }}>
      <Header title="Dashboard" />
      <PageContainer title="Dashboard">
        <Typography variant="h6">Dashboard (Protected)</Typography>
      </PageContainer>
    </ContainerBox>
  );
}
