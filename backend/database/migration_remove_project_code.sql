-- 프로젝트 코드 제거 및 is_shared 컬럼 추가 마이그레이션
-- 실행 전 백업을 권장합니다.

USE todo_ai;

-- 1. is_shared 컬럼 추가 (기존 project_code가 있으면 1, 없으면 0)
ALTER TABLE projects 
ADD COLUMN is_shared TINYINT(1) DEFAULT 0 AFTER description;

-- 2. 기존 데이터 마이그레이션 (project_code가 있으면 is_shared = 1)
UPDATE projects 
SET is_shared = 1 
WHERE project_code IS NOT NULL;

-- 3. project_code 컬럼 제거
ALTER TABLE projects 
DROP COLUMN project_code;

-- 4. project_code 인덱스 제거 (자동으로 제거됨)
-- DROP INDEX idx_projects_code ON projects; -- 필요시 수동 실행

-- 5. is_shared 인덱스 추가 (선택사항, 성능 향상을 위해)
CREATE INDEX idx_projects_is_shared ON projects(is_shared);

