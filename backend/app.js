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

// Import database
var { initDatabase } = require('./database/init');

var app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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

// Initialize database
initDatabase();

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
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
