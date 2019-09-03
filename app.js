var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
// var logger = require('morgan');
var socket_io = require('socket.io');
var mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const session = require('express-session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
var io = socket_io();
app.io = io;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({secret: 'ssshhhhh', resave: true, saveUninitialized: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

app.use('/', indexRouter);
app.use('/users', usersRouter);


// ############################### Routing for all post methods ##################################
var userSession;

app.post('/signup_completion', function(req, res) {
    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let profilePic = req.files.profilePic;
    let email = req.body.email;
    let name = req.body.name;
    let password = req.body.password;

    var newUser = new User({name: name, email: email, password: password, blocklist: [], isActive: true});

    newUser.save().then(function() {
        User.findOne({email: email, password: password})

        .then (function(doc) {
            let userId = doc._id;

            // Use the mv() method to place the file somewhere on your server
            profilePic.mv(path.join(__dirname, '/public/images/propics/') + userId + '.jpg', function(err) {
                if (err) {
                    return res.status(500).send(err);
                } else {
                    userSession = req.session;
                    userSession.userId = userId;
            
                    res.redirect('/');
                }
            })
        })    
    })
});

app.post('/signincheck', function(req, res) {
    userSession = req.session;
    userSession.email = req.body.email;
    
    return res.redirect('/');
})


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


// ############ MongoDB Setup ####################
var dbConnect = process.env.MONGODB_URI || 'mongodb://localhost/whisper';

mongoose.connect(dbConnect, {useNewUrlParser: true}, function(err){
    if(err){
        console.log('Database Connection failed.')
    }
    else{
        console.log('Database Connected.')
    }
})

var userSchema = mongoose.Schema({
    name: String,
    email: String,
    password: String,
    blocklist: Array,
    isActive: Boolean
})

var msgSchema = mongoose.Schema({
    senderId: String,
    recieverId: String,
    message: String,
    isRead: Boolean,
    isSeen: Boolean,
    timeForSender: String,
    timeForSender: String,
    deletedForSender: Boolean,
    deletedForReciever: Boolean
})

var User = mongoose.model('users', userSchema); 
var Message = mongoose.model('personal_messages', msgSchema);


// ############ Socket Programs ####################
var userSockets = {};
io.on('connection', function(socket) {
    console.log('connected');


    // ############ MongoDB Related Functions ####################
    function emailAvailabilityChecker(email) {

        User.findOne({email: email}, function(err, doc) {
            if (err) {
                console.log('err')
                throw err;
            } else if (doc) {
                socket.emit('emailIsNotAvailable');
            } else {
                socket.emit('emailIsAvailable');
            }
        })
    }


    // ################## Socket Evolution #####################
    socket.on('isAvailableEmail', function(email) {
        emailAvailabilityChecker(email);
    })

    socket.on('loginCheck', function(user) {
        let email = user.email;
        let password = user.password;
        // socket.email = email;
        // userSockets[email] = socket;
        // console.log(userSockets);
        console.log('faced')

        User.findOne({email: email, password: password}, function(err, doc) {
            if (err) {
                console.log('err')
                throw err;
            } else if (doc) {
                socket.emit('loginSuccessful');
                console.log('success')
                // console.log("Hello : " + doc._id);
                // User.findOne({_id: doc._id}).then(function(doc) {
                //     console.log(doc)
                // })
            } else {
                socket.emit('loginFailed');
                console.log('fail')
            }
        })
    })

    socket.on('disconnect', function() {
        console.log('disconnected');
        
    })
})

module.exports = app;
