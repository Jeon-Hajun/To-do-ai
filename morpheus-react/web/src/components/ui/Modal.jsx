// Modal.jsx
import React from "react";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export default function ModalComponent({ isOpen, onClose, children }) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 400, md: 500 },
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: { xs: 2, sm: 4 },
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* 헤더 영역: X 버튼 공간 확보 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* 모달 내용 */}
        <Box>
          {children}
        </Box>
      </Box>
    </Modal>
  );
}
