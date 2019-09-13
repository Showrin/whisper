var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    let userSession = req.session;
    
    if(userSession.userId) {
        res.render('index', { title: 'Whisper', userId: userSession.userId});
    } else {
        return res.redirect('/signin');
    }
    
});


router.get('/signin', function(req, res, next) {
   let userSession = req.session;

    if (userSession.userId) {
        return res.redirect('/');
    } else {
        res.render('signin');
    }

});


router.get('/signup', function(req, res, next) {

    var userSession = req.session;

    if(userSession.userId) {
      return res.redirect('/');
    } else {
      res.render('signup');
    }
  
});

router.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/signin');
})

module.exports = router;
