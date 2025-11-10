import React from 'react';
import Button from '../ui/Button';
import { isOwner } from '../../utils/auth';

export default function ProjectCard({ project, onLeave, onDelete, onUpdate }) {
  if (!project) return null;

  const owner = isOwner(project); // 오너 여부 확인

  return (
    <div style={{ border: '1px solid #ccc', padding: '12px', marginBottom: '12px', borderRadius: '8px' }}>
      <h3>{project.title}</h3>
      {project.description && <p>{project.description}</p>}

      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        {owner ? (
          // 오너면 삭제 버튼 + (옵션) 수정 버튼
          <>
            <Button type="danger" onClick={() => onDelete(project.id)}>삭제</Button>
            {onUpdate && <Button onClick={() => onUpdate(project)}>수정</Button>}
          </>
        ) : (
          // 참여자면 나가기 버튼
          <Button type="secondary" onClick={() => onLeave(project.id)}>나가기</Button>
        )}
      </div>
    </div>
  );
}
