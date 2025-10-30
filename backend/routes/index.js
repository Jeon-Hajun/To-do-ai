var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({ 
    message: 'Todo AI Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/* Health check */
router.get('/health', function(req, res, next) {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
