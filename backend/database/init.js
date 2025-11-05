var sqlite3 = require('sqlite3').verbose();
var path = require('path');
require('dotenv').config();

var dbPath = process.env.DB_PATH || path.join(__dirname, 'todo.db');
var db = new sqlite3.Database(dbPath);

// FOREIGN KEY 활성화 (SQLite는 기본적으로 무시하므로 필수)
db.run('PRAGMA foreign_keys = ON');

function initDatabase() {
  db.serialize(function() {
    // Users 테이블
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT NOT NULL,
        profile_image TEXT DEFAULT 'basic.png',
        region TEXT,
        is_admin INTEGER DEFAULT 0 CHECK(is_admin IN (0, 1)),
        is_suspended INTEGER DEFAULT 0 CHECK(is_suspended IN (0, 1)),
        suspension_reason TEXT,
        suspension_start_date DATETIME,
        suspension_end_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Users 인덱스
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

    // Projects 테이블
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        project_code TEXT UNIQUE,
        password_hash TEXT,
        owner_id INTEGER NOT NULL,
        github_repo TEXT,
        github_token TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'completed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    // Projects 인덱스
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);

    // ProjectMembers 테이블
    db.run(`
      CREATE TABLE IF NOT EXISTS project_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(project_id, user_id)
      )
    `);

    // ProjectMembers 인덱스
    db.run(`CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role)`);

    // Tasks 테이블
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        assigned_user_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done', 'cancelled')),
        github_issue_number INTEGER,
        due_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Tasks 인덱스
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_github_issue ON tasks(github_issue_number)`);

    // ProjectCommits 테이블
    db.run(`
      CREATE TABLE IF NOT EXISTS project_commits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        task_id INTEGER,
        commit_sha TEXT NOT NULL,
        commit_message TEXT,
        author TEXT,
        commit_date DATETIME,
        lines_added INTEGER DEFAULT 0,
        lines_deleted INTEGER DEFAULT 0,
        files_changed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        UNIQUE(project_id, commit_sha)
      )
    `);

    // ProjectCommits 인덱스
    db.run(`CREATE INDEX IF NOT EXISTS idx_commits_project ON project_commits(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_commits_task ON project_commits(task_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_commits_date ON project_commits(commit_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_commits_sha ON project_commits(commit_sha)`);

    // AI_Logs 테이블
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_id INTEGER,
        project_id INTEGER,
        type TEXT NOT NULL CHECK(type IN ('task_suggestion', 'refactoring_suggestion', 'completion_check')),
        input TEXT,
        output TEXT,
        feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      )
    `);

    // AI_Logs 인덱스
    db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_logs(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_project ON ai_logs(project_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_type ON ai_logs(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs(created_at)`);

    console.log('Database initialized successfully');
  });
}

module.exports = { db, initDatabase };
