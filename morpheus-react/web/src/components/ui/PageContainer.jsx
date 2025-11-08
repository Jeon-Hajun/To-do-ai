import React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import PropTypes from "prop-types";

/**
 * 페이지 전용 컨테이너
 * - Header와 NavBar 제외한 영역 flex로 채움
 * - overflowY: auto로 스크롤 가능
 * - title, subtitle Text 기능 내장
 * - NavBar 높이만큼 padding-bottom 추가
 */
export default function PageContainer({
  children,
  title,
  subtitle,
  maxWidth = "md",
  sx = {},
  titleSx = {},
  subtitleSx = {},
  titleVariant = "h5",
  subtitleVariant = "body1",
  titleAlign = "center",
  subtitleAlign = "center",
  titleColor = "text.primary",
  subtitleColor = "text.secondary",
  navBarHeight = 64, // NavBar 높이 기본값(px)
  ...props
}) {
  const Text = ({ children, variant, align, color, sx }) => (
    <Typography variant={variant} align={align} color={color} sx={sx}>
      {children}
    </Typography>
  );

  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        overflowY: "auto",
        pt: 4,
        pb: `${navBarHeight}px`, // NavBar 높이만큼 패딩
        ...sx,
      }}
      {...props}
    >
      {title && (
        <Text
          variant={titleVariant}
          align={titleAlign}
          color={titleColor}
          sx={{ mb: 2, ...titleSx }}
        >
          {title}
        </Text>
      )}
      {subtitle && (
        <Text
          variant={subtitleVariant}
          align={subtitleAlign}
          color={subtitleColor}
          sx={{ mb: 3, ...subtitleSx }}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </Container>
  );
}

PageContainer.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  sx: PropTypes.object,
  titleSx: PropTypes.object,
  subtitleSx: PropTypes.object,
  titleVariant: PropTypes.string,
  subtitleVariant: PropTypes.string,
  titleAlign: PropTypes.oneOf(["inherit", "left", "center", "right", "justify"]),
  subtitleAlign: PropTypes.oneOf(["inherit", "left", "center", "right", "justify"]),
  titleColor: PropTypes.string,
  subtitleColor: PropTypes.string,
  navBarHeight: PropTypes.number, // NavBar 높이
};
