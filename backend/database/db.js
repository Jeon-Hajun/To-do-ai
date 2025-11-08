var mysql = require('mysql2');
require('dotenv').config();

// MySQL 연결 풀 생성
var pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'todo_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 쿼리 실행 헬퍼 함수 (콜백 방식)
function query(sql, params, callback) {
  pool.query(sql, params, callback);
}

// 단일 행 조회
function get(sql, params, callback) {
  pool.query(sql, params, function(err, results) {
    if (err) return callback(err);
    callback(null, results[0] || null);
  });
}

// 모든 행 조회
function all(sql, params, callback) {
  pool.query(sql, params, callback);
}

// 실행 (INSERT, UPDATE, DELETE)
function run(sql, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }
  pool.query(sql, params, function(err, results) {
    if (err) {
      return callback(err);
    }
    // MySQL 결과를 SQLite 스타일로 변환 (this.lastID, this.changes 사용 가능)
    var context = {
      lastID: results.insertId,
      changes: results.affectedRows
    };
    callback.call(context, err);
  });
}

// MySQL 쿼리 인터페이스 (기존 코드 호환성)
var db = {
  get: get,
  all: all,
  run: function(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    run(sql, params, callback);
  },
  query: query,
  pool: pool
};

module.exports = { db, pool, query, get, all, run };
