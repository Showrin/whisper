var express = require('express');
var router = express.Router();

/* GET signin page. */
router.get('/', function(req, res, next) {
  let sess = req.session;

  if (sess.email) {
    return res.redirect('/');
  }
  
  res.render('signin');
});

module.exports = router;
