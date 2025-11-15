var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var helmet = require('helmet');
require('dotenv').config();

// Import routes
var indexRouter = require('./routes/index');
var userRouter = require('./routes/user');
var projectRouter = require('./routes/project');
var taskRouter = require('./routes/task');
var githubRouter = require('./routes/github');
var progressRouter = require('./routes/progress');
var aiRouter = require('./routes/ai');

var app = express();

// Security middleware
app.use(helmet());

// CORS configuration
// 환경변수에서 가져오거나 기본값 사용
// CORS_ORIGIN=http://localhost:5175,http://220.69.240.143:5175 (여러 개는 쉼표로 구분)
const getDefaultCorsOrigin = () => {
  const port = process.env.VITE_PORT || '5175';
  return [`http://localhost:${port}`];
};

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : getDefaultCorsOrigin();

app.use(cors({
  origin: function (origin, callback) {
    // 개발 환경에서는 origin이 없을 수도 있음 (같은 도메인 요청 등)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS 정책에 의해 차단되었습니다.'));
    }
  },
  credentials: true
}));

// Logging
app.use(logger('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);
app.use('/api/user', userRouter);
app.use('/api/project', projectRouter);
app.use('/api/task', taskRouter);
app.use('/api/github', githubRouter);
app.use('/api/progress', progressRouter);
app.use('/api/ai', aiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // JSON 응답으로 변경 (React 프론트엔드용)
  res.status(err.status || 500);
  res.json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: err.message || '서버 오류가 발생했습니다.',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

module.exports = app;
