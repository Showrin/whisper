var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
// var logger = require('morgan');
var socket_io = require('socket.io');
var mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const SocketIOFile = require('socket.io-file');

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


 // ############################### Routing for sharedFile get method ##################################
app.get('/socket.io-file-client.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
});

// define a route to download shared file 
app.get('/download/:file(*)',(req, res) => {

    var userSession = req.session;

    if(userSession.userId) {
        var file = req.params.file;
        var fileLocation = path.join('./public/sharedFiles',file);
        console.log(fileLocation);
        res.download(fileLocation, file);
    } else {
        return res.redirect('/signin');
    } 
});


// ############################### Routing for all post methods ##################################


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
                    var userSession;
                    userSession = req.session;
                    userSession.userId = userId;
            
                    res.redirect('/');
                }
            })
        })    
    })
});

app.post('/signincheck', function(req, res) {
    email = req.body.email;
    
    User.findOne({email: email}).then(function(doc) {
        let userId = doc._id.toString();
        let userSession = req.session;
        userSession.userId = userId;

        res.redirect('/');
    })
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
    messageType: String,
    isRead: Boolean,
    isSeen: Boolean,
    messageTime: {type: Date, default: Date.now},
    deletedForSender: Boolean,
    deletedForReciever: Boolean
})

var User = mongoose.model('users', userSchema); 
var Message = mongoose.model('personal_messages', msgSchema);

// Message.deleteMany({messageType: 'file'}, function(err, data) {
//     console.log(data)
// })

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

    socket.on('loginEmailCheck', function(email) {
        
        User.findOne({email: email}, function(err, doc) {
            if (err) {
                console.log('err')
                throw err;
            } else if (doc) {
                socket.emit('emailMatched', doc.password);
            } else {
                socket.emit('emailNotMatched');
            }
        })
    })

    socket.on('saveSocket', function(userId) {
        socket.userId = userId;
        userSockets[userId] = socket;
        User.updateMany({_id: userId},{$set:{isActive: true}}).then(function() {
            io.sockets.emit('activeUserUpdate', userId);
        })

    })

    socket.on('fetchInitialUpdateOnPageLoad', function(userId) {
        
        var userList = [];
        User.find({}, async function(err, users) {
            await new Promise(async function(resolve) {
                for(let i = 0; i < users.length; ++i) {
                    if(users[i]._id != userId) {
                        await Message.find({senderId: {$in: [users[i]._id, userId]}, recieverId: {$in: [users[i]._id, userId]}}).then(function(messages){
                            
                            let index = messages.length - 1;
                            if (messages[index].senderId == userId) {
                                lastMsgIsYours = true;
                                isRead = false;

                            } else {
                                lastMsgIsYours = false;

                                if(messages[index].isSeen) {
                                    isRead = true;

                                } else {
                                    isRead = false;

                                }
                            }

                            userList.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: lastMsgIsYours, lastMsgTime: messages[index].messageTime, isSeen: messages[index].isSeen, isRead: isRead, messageType: messages[index].messageType, lastMsg: messages[index].message});
                            
                        }).catch(function(err) {
                            
                            userList.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: false, lastMsgTime: "", isSeen: false, isRead: false, messageType: "", lastMsg: ""});
                        })
                    }
                }

                resolve();
            });
            
            socket.emit('initialUpdateOnPageload', userList);
        })
    })

    socket.on('saveMessageInServerDB', function(messagePacket) {
        var newMessage = new Message({senderId: messagePacket.selfUserId, recieverId: messagePacket.recieverId, message: messagePacket.sentMessage, messageType: messagePacket.messageType, isSeen: false, deletedForSender: false, deletedForReciever: false});

        newMessage.save().then(function() {
            
            Message.find({senderId: messagePacket.selfUserId, recieverId: messagePacket.recieverId}).then(function(messages) {
                theMessage = messages[messages.length-1]; //it returns the ever last message
                messageId = theMessage._id;
                senderId = theMessage.senderId;
                recieverId = theMessage.recieverId;
                messageToSee = theMessage.message;
                messageType = theMessage.messageType;
                isSeen = theMessage.isSeen;
                deletedForSender = theMessage.deletedForSender;
                deletedForReciever = theMessage.deletedForReciever;
                messageTime = theMessage.messageTime;
                
                if(userSockets[recieverId]) {
                    userSockets[recieverId].emit('newMessageFromOtherToSender', {_Id: messageId, senderId: senderId, recieverId: recieverId, message: messageToSee, messageType: messageType, isSeen: isSeen, deletedForSender: deletedForSender, deletedForReciever: deletedForReciever, messageTime: messageTime});
                }

                socket.emit('confirmationOfsavingMessageToSender', {_Id: messageId, senderId: senderId, recieverId: recieverId, message: messageToSee, messageType: messageType, isSeen: isSeen, deletedForSender: deletedForSender, deletedForReciever: deletedForReciever, messageTime: messageTime});

                console.log(messages[messages.length-1]);

                var userListForSender = [];
                User.find({}, async function(err, users) {
                    await new Promise(async function(resolve) {
                        for(let i = 0; i < users.length; ++i) {
                            if(users[i]._id != senderId) {
                                await Message.find({senderId: {$in: [users[i]._id, senderId]}, recieverId: {$in: [users[i]._id, senderId]}}).then(function(messages){
                                    
                                    let index = messages.length - 1;
                                    if (messages[index].senderId == senderId) {
                                        lastMsgIsYours = true;
                                        isRead = false;

                                    } else {
                                        lastMsgIsYours = false;

                                        if(messages[index].isSeen) {
                                            isRead = true;

                                        } else {
                                            isRead = false;

                                        }
                                    }

                                    userListForSender.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: lastMsgIsYours, lastMsgTime: messages[index].messageTime, isSeen: messages[index].isSeen, isRead: isRead, messageType: messages[index].messageType, lastMsg: messages[index].message});
                                    
                                }).catch(function(err) {
                                    
                                    userListForSender.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: false, lastMsgTime: "", isSeen: false, isRead: false, messageType: "", lastMsg: ""});
                                })
                            }
                        }

                        resolve();
                    });
                    
                    socket.emit('userlistUpdate', userListForSender);
                })

                var userListForReciever = [];
                User.find({}, async function(err, users) {
                    await new Promise(async function(resolve) {
                        for(let i = 0; i < users.length; ++i) {
                            if(users[i]._id != recieverId) {
                                await Message.find({senderId: {$in: [users[i]._id, recieverId]}, recieverId: {$in: [users[i]._id, recieverId]}}).then(function(messages){
                                    
                                    let index = messages.length - 1;
                                    if (messages[index].senderId == recieverId) {
                                        lastMsgIsYours = true;
                                        isRead = false;

                                    } else {
                                        lastMsgIsYours = false;

                                        if(messages[index].isSeen) {
                                            isRead = true;

                                        } else {
                                            isRead = false;

                                        }
                                    }

                                    userListForReciever.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: lastMsgIsYours, lastMsgTime: messages[index].messageTime, isSeen: messages[index].isSeen, isRead: isRead, messageType: messages[index].messageType, lastMsg: messages[index].message});
                                    
                                }).catch(function(err) {
                                    
                                    userListForReciever.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: false, lastMsgTime: "", isSeen: false, isRead: false, messageType: "", lastMsg: ""});
                                })
                            }
                        }

                        resolve();
                    });
                    
                    if(userSockets[recieverId]) {
                        userSockets[recieverId].emit('userlistUpdate', userListForReciever);
                    }
                })
            })            
        })
    })

    socket.on('initialChatboxMessagesUpdate', function(ids) {
        Message.find({senderId: {$in: [ids.senderId, ids.recieverId]}, recieverId: {$in: [ids.senderId, ids.recieverId]}}).then(function(messages) {
            socket.emit('initialChatboxMessages', messages);
        })
    })

    socket.on('chatBoxUpdateOnUserChange', function(ids) {
        Message.find({senderId: {$in: [ids.userId, ids.recieverId]}, recieverId: {$in: [ids.userId, ids.recieverId]}}).then(function(messages) {
            console.log(messages)
            socket.emit('chatboxMessagesOnUserChange', messages);
        })
    })

    socket.on('seenMessagesUpadate', function(ids) {

        Message.updateMany({senderId: ids.senderId, recieverId: ids.recieverId, isSeen: false},{$set:{isSeen: true}})
        .then((updatedMessages)=>{
            
            var userListForReciever = [];
            User.find({}, async function(err, users) {
                await new Promise(async function(resolve) {
                    for(let i = 0; i < users.length; ++i) {
                        if(users[i]._id != ids.senderId) {
                            await Message.find({senderId: {$in: [users[i]._id, ids.senderId]}, recieverId: {$in: [users[i]._id, ids.senderId]}}).then(function(messages){
                                
                                let index = messages.length - 1;
                                if (messages[index].senderId == ids.senderId) {
                                    lastMsgIsYours = true;
                                    isRead = false;

                                } else {
                                    lastMsgIsYours = false;

                                    if(messages[index].isSeen) {
                                        isRead = true;

                                    } else {
                                        isRead = false;

                                    }
                                }

                                userListForReciever.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: lastMsgIsYours, lastMsgTime: messages[index].messageTime, isSeen: messages[index].isSeen, isRead: isRead, messageType: messages[index].messageType, lastMsg: messages[index].message});
                                
                            }).catch(function(err) {
                                
                                userListForReciever.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: false, lastMsgTime: "", isSeen: false, isRead: false, messageType: "", lastMsg: ""});
                            })
                        }
                    }

                    resolve();
                });
                
                if(userSockets[ids.senderId]) {
                    userSockets[ids.senderId].emit('userlistUpdate', userListForReciever);
                }
            })

        }).catch((err)=>{
            
        })
    })

    socket.on('chatBoxSeenMessageUpdate', function(senderId) {
        if(userSockets[senderId]) {
            userSockets[senderId].emit('chatBoxSeenMessageUpdateToSender');
        }
    })

    var uploader = new SocketIOFile(socket, {
        uploadDir: 'public/sharedFiles',							// simple directory
        accepts: [],
        chunkSize: 1024000,							// default is 10240(1KB)
        transmissionDelay: 0,						// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
        overwrite: false
    });

    socket.on('logout', function(userId) {
        
        User.updateMany({_id: userId},{$set:{isActive: false}}).then(function() {
            io.sockets.emit('inactiveUserUpdate', userId);
        })
    })

    socket.on('disconnect', function() {
        
        User.updateMany({_id: socket.userId},{$set:{isActive: false}}).then(function() {
            io.sockets.emit('inactiveUserUpdate', socket.userId);
        })
        console.log('disconnected');
        
    })
})


module.exports = app;
