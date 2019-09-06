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

app.post('/shareFile', function(req, res) {
    let sharedFile = req.files.sharedFile;

    sharedFile.mv(path.join(__dirname, '/public/images/sharedFilse/') + sharedFile.name, function(err) {
        if (err) {
            
        } else {
            res.redirect('/')
        }
    })
})

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


// -------------- User defined functions -----------------
// update user list


// function saveUserListInSession(userList, userSess = userSession) {
//     userSess.userList = userList;
//     // console.log(userSession);
//     // console.log(userList);
// }

// var userList = [];
//     User.find({}, async function(err, users) {
//         await new Promise(async function(resolve) {
//             for(let i = 0; i < users.length; ++i) {
//                 if(users[i]._id != userId) {
//                     await Message.find({senderId: {$in: [users[i]._id, userId]}, recieverId: {$in: [users[i]._id, userId]}}).sort({messageTime: -1}).then(function(messages){
//                         for(let i = 0; i == 0; ++i) {
//                             if (messages[i].senderId == userId) {
//                                 lastMsgIsYours = true;

//                             } else {
//                                 lastMsgIsYours = false;

//                                 if(messages[i].isSeen) {
//                                     isRead = true;

//                                 } else {
//                                     isRead = false;

//                                 }
//                             }
//                         }

//                         userList.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: lastMsgIsYours, messageTime: messages[i].messageTime, isSeen: messages[i].isSeen, isRead: isRead, messageType: messages[i].messageType, messages: messages[i].message});
                        
//                     }).catch(function(err) {
//                         console.log('error');
//                         userList.push({userId: users[i]._id, name: users[i].name, isActive: users[i].isActive, lastMsgIsYours: false, messageTime: "", isSeen: false, isRead: false, messageType: "", messages: ""});
//                     })
//                 }
//             }

//             resolve();

//         });
//         // console.log(userSession);
//         saveUserListInSession(userList);
//     })

// console.log(userSession);

// async function updateUserList(userId, callback) {
    
// }

// updateUserList(userId, saveUserListInSession)
    

// function getUsers(selfUserId) {
//     var users;
//     User.find({_id: {$ne: selfUserId}}).exec();
// }
// console.log(users);
// console.log(getUsers("5d6f05fb1004e43b14321d11"));


// function updateUserList(userId) {
//     User.find({}, function(err, users) {
//         if(err) {
//             throw err;
            
//         } else if(users) {
//             for (let i = 0; i < users.length; ++i) {
//                 if (users[i]._id != userId) {
//                     console.log(users[i].name);

//                     Message.find({senderId: {$in: [users[i]._id, userId]}, recieverId: {$in: [users[i]._id, userId]}}).sort({messageTime: -1}).exec(function(err, messages) {
//                         for (let i = 0; i < messages.length; ++i) {
//                             if (i > 0) {
//                                 break;
                                
//                             } else {
//                                 if (messages[i].senderId == userId) {
//                                     lastMsgIsYours = true;

//                                 } else {
//                                     lastMsgIsYours = false;

//                                     if(messages[i].isSeen) {
//                                         isRead = true;

//                                     } else {
//                                         isRead = false;

//                                     }
//                                 }

//                                 pushUser();
//                             }
//                         }
//                     }) 
//                 }
//             }
//         }
//     }).then(()=> {
//         show()
//     });
// }
// function pushUser(userId, name, isActive, lastMsgIsYours, messageTime, isSeen, isRead, messageType, message) {
//     userList.push({userId: userId, name: name, isActive: isActive, lastMsgIsYours: lastMsgIsYours, lastMsgTime: messageTime, isSeen: isSeen, isRead: isRead, msgType: messageType, lastMsg: message});
// }

// function show() {
//     console.log(userList);
// }



// show()

// async function init () {
//     await pre();
//     pos();
// }

// function pre() {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             console.log('lalalal')
//             resolve()
//         }, 1000);
//     }) 
// }

// function pos() {
//     console.log('yes')
// }

// init()

// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }
  
//   async function demo() {
//     console.log('2...');
//     await sleep(2000);
//     console.log('3...');
//   }
  
//   console.log('1...');
//   demo().then(() => {
//       console.log('4.');
//   });


module.exports = app;
