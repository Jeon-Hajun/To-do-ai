-- Todo AI 데이터베이스 스키마
-- MySQL Workbench에서 실행할 스크립트
-- 전체 내용을 복사해서 MySQL Workbench의 SQL Editor에서 실행하세요

-- 1. 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS todo_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 데이터베이스 선택
USE todo_ai;

-- 3. 외래 키 제약 조건 활성화
SET FOREIGN_KEY_CHECKS = 1;

-- Users 테이블
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(255) NOT NULL,
  profile_image VARCHAR(255) DEFAULT 'basic.png',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- UserTags 테이블 (사용자별 직무 태그)
CREATE TABLE IF NOT EXISTS user_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tag VARCHAR(50) NOT NULL COMMENT '직무 태그 (예: 백엔드, 프론트엔드, 디자이너)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_tag (user_id, tag),
  INDEX idx_user_tags_user (user_id),
  INDEX idx_user_tags_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects 테이블
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_shared TINYINT(1) DEFAULT 0 COMMENT '공유 프로젝트 여부 (0: 비공유, 1: 공유)',
  password_hash VARCHAR(255),
  owner_id INT NOT NULL,
  github_repo VARCHAR(500),
  github_token VARCHAR(255),
  github_last_synced_at DATETIME NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_projects_owner (owner_id),
  INDEX idx_projects_is_shared (is_shared),
  INDEX idx_projects_status (status),
  INDEX idx_projects_github_synced (github_last_synced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ProjectMembers 테이블
CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_user (project_id, user_id),
  INDEX idx_project_members_project (project_id),
  INDEX idx_project_members_user (user_id),
  INDEX idx_project_members_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks 테이블
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  assigned_user_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo',
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tasks_project (project_id),
  INDEX idx_tasks_assigned (assigned_user_id),
  INDEX idx_tasks_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ProjectCommits 테이블
CREATE TABLE IF NOT EXISTS project_commits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  task_id INT,
  commit_sha VARCHAR(40) NOT NULL,
  commit_message TEXT,
  author VARCHAR(255),
  commit_date DATETIME,
  lines_added INT DEFAULT 0,
  lines_deleted INT DEFAULT 0,
  files_changed INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  UNIQUE KEY unique_project_commit (project_id, commit_sha),
  INDEX idx_commits_project (project_id),
  INDEX idx_commits_task (task_id),
  INDEX idx_commits_date (commit_date),
  INDEX idx_commits_sha (commit_sha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ProjectCommitFiles 테이블 (커밋별 파일 변경 내용)
CREATE TABLE IF NOT EXISTS project_commit_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  commit_sha VARCHAR(40) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'modified',
  additions INT DEFAULT 0,
  deletions INT DEFAULT 0,
  patch TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_commit_files_project (project_id),
  INDEX idx_commit_files_commit (commit_sha),
  INDEX idx_commit_files_path (file_path),
  UNIQUE KEY unique_commit_file (project_id, commit_sha, file_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ProjectIssues 테이블
CREATE TABLE IF NOT EXISTS project_issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  issue_number INT NOT NULL,
  title VARCHAR(255),
  body TEXT,
  state VARCHAR(20) DEFAULT 'open',
  assignees TEXT,
  labels TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  closed_at DATETIME,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_issue (project_id, issue_number),
  INDEX idx_issues_project (project_id),
  INDEX idx_issues_number (issue_number),
  INDEX idx_issues_state (state),
  INDEX idx_issues_synced (synced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ProjectBranches 테이블
CREATE TABLE IF NOT EXISTS project_branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(40),
  is_protected BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_branch (project_id, branch_name),
  INDEX idx_branches_project (project_id),
  INDEX idx_branches_name (branch_name),
  INDEX idx_branches_synced (synced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI_Logs 테이블
CREATE TABLE IF NOT EXISTS ai_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  task_id INT,
  project_id INT,
  type VARCHAR(50) NOT NULL,
  input TEXT,
  output TEXT,
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  INDEX idx_ai_logs_user (user_id),
  INDEX idx_ai_logs_project (project_id),
  INDEX idx_ai_logs_type (type),
  INDEX idx_ai_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI_Chat_Conversations 테이블 (챗봇 대화 세션)
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_chat_conversations_project_user (project_id, user_id),
  INDEX idx_chat_conversations_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI_Chat_Messages 테이블 (챗봇 대화 메시지)
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  role VARCHAR(20) NOT NULL COMMENT 'user 또는 assistant',
  content TEXT NOT NULL,
  agent_type VARCHAR(50) COMMENT '사용된 agent 타입 (task_suggestion_agent, progress_analysis_agent, task_completion_agent)',
  metadata JSON COMMENT '추가 메타데이터 (JSON 형식)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
  INDEX idx_chat_messages_conversation (conversation_id),
  INDEX idx_chat_messages_created (created_at),
  INDEX idx_chat_messages_agent_type (agent_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
