const userId = $('.navbar').attr('id');

// save socket in server
socket.emit('saveSocket', userId);

// initial update at the time of loading the page
socket.emit('fetchInitialUpdateOnPageLoad', userId);
socket.on('initialUpdateOnPageload', function(userList) {
    initialUpdateUserlist(userList);
})


// update userlist function
function initialUpdateUserlist(userList) {

    userList.forEach((user) => {
        if (user.lastMsgTime == "") {
            user.lastMsgTime = "1970-01-01T22:21:55.984Z";
        } else {
        }
    })

    // sorting user based on last message
    userList.sort((a, b) => (a.lastMsgTime > b.lastMsgTime) ? -1 : 1);

    userList.forEach((user, index) => {
        let name = user.name.toLowerCase();
        let lastMsgTime;
        let message, isReadClass = '', isActiveClass = '', isSeenClass = '', isSeenImgSrc = '', activeTabClass = '';
        
        if(index == 0) {
            activeTabClass = 'active';
        } else {
            activeTabClass = '';
        }

        if(user.lastMsgIsYours) {

            if (user.messageType == "file") {
                message = 'You: File';
            } else {
                message = `You: ${doDecryption(user.lastMsg)}`;
            }
            
            if (user.lastMsgTime != "1970-01-01T22:21:55.984Z") {
                lastMsgTimeStyle = `style="opacity: 1;"`
            } else {
                lastMsgTimeStyle = `style="opacity: 0;"`
            }
            
        } else {

            if (user.messageType == "file") {
                message = 'You: File';
            } else {
                message = `${doDecryption(user.lastMsg)}`;
            }

            lastMsgTimeStyle = `style="opacity: 0;"`

            if(user.isRead || message == "") {
                isReadClass = '';
            } else {
                isReadClass = 'not_read_msg';
            }
        }

        if(user.isActive) {
            isActiveClass = `is-active_indicator`;
        } else {
            isActiveClass = ``;
        }

        if(user.isSeen) {
            isSeenClass = `seen_indicator`;
            isSeenImgSrc = `seen.svg`;
        } else {
            isSeenClass = `not-seen_indicator`;
            isSeenImgSrc = `not_seen.svg`;
        }

        if (user.lastMsgTime != "1970-01-01T22:21:55.984Z") {
            lastMsgTime = moment(user.lastMsgTime.toString()).format('hh:mm a');
        } else {
            lastMsgTime = "";
        }

        console.log(userList)

        //initial userlist update
        let userDiv = `<div class='user ${activeTabClass}' data-userid="${user.userId}" data-name="${user.name.toLowerCase()}" data-is-active="${user.isActive}"><div class='user_pic-container'><img src='/images/propics/${user.userId}.jpg'></div><div class="user_info-container"><span class="user_name ${isReadClass}">${name.toLowerCase()}<span class="${isActiveClass}"></span></span><span class="user_msg ${isReadClass}">${message}</span></div><div class="user_confirmation-time-container"><span><img class="${isSeenClass}" ${lastMsgTimeStyle} src="/images/icons/${isSeenImgSrc}"></span><span class="msg_time"> <span class="circle" ${lastMsgTimeStyle}></span>${lastMsgTime}</span></div>`;

        $('#userlist').append(userDiv);

        if (index == 0) {
            //initial navbar update
            $('#js_navbar_profile_pic').attr('src', `/images/propics/${user.userId}.jpg`);
            $('#js_navbar_profile_name').text(user.name.toLowerCase());
            $('.navbar_chatbox-portion_user-details').attr('id', user.userId)
    
            if(user.isActive) {
                $('#js_navbar_active_status').text('Active now');
            } else {
                $('#js_navbar_active_status').text('');
            }

            // initial info page update
            $('#js_info_pic').attr('src', `/images/propics/${user.userId}.jpg`);
            $('#js_info_name').text(user.name.toLowerCase());

            // initial chatbox update (request for message)
            let senderId = userId;
            let recieverId = user.userId;
            socket.emit('initialChatboxMessagesUpdate', {senderId, recieverId}); 

            // sending seen message update
            socket.emit('seenMessagesUpadate', {senderId: user.userId, recieverId: userId});
            socket.emit('chatBoxSeenMessageUpdate', user.userId);
            
        }

    });
}

// file upload modal opening

$('#js_chatbox_sendfile-btn').click(function() {

    openLoginErrorModal();
})

// sharing files
var uploader = new SocketIOFileClient(socket);
var form = $('#js_fileShare_form');
var sentMessage, messageId, fileName, fileNameArray;
 
uploader.on('start', function(fileInfo) {
    console.log('Start uploading', fileInfo);
});

uploader.on('stream', function(fileInfo) {
    console.log('Streaming... sent ' + fileInfo.sent + ' bytes.');
    let uploadPercentage = (fileInfo.sent / fileInfo.size) * 100;

    $('#js_file_upload_progress_bar').css('width', `${uploadPercentage}%`);
});

uploader.on('complete', function(fileInfo) {
    console.log('Upload Complete', fileInfo);

    let recieverId = $('.navbar_chatbox-portion_user-details').attr('id');
    let selfUserId = $('.navbar').attr('id');
    let messageType = 'file';
    
    $('#js_file_upload_progress_bar').css('width', `100%`);
    setTimeout(() => {
        $(`#${messageId}`).remove();

        if(sentMessage != "") {
            sentMessage = doEncryption(sentMessage);
            socket.emit('saveMessageInServerDB', {messageId, selfUserId, recieverId, messageType, sentMessage});
        }
    }, 500);

    $('#js_file_share_input').val('');
});
 
form.submit(function(e) {
    e.preventDefault();

    let recieverId = $('.navbar_chatbox-portion_user-details').attr('id');
    let selfUserId = $('.navbar').attr('id');
    fileNameArray = $('#js_file_share_input').val().split(`\\`);
    fileName = fileNameArray[fileNameArray.length - 1];
    sentMessage = `${selfUserId}---${recieverId}---${Date.now()}---` + fileName;
    messageId = sentMessage.replace(/ /g, "").replace(/---/g, "").replace(/-/g, "").replace(/\./g, "").replace(/\(/g, "").replace(/\)/g, "").replace(/\{/g, "").replace(/\}/g, "").replace(/\[/g, "").replace(/\]/g, "");
    let messageType = 'file';

    var sharedFile = document.getElementById('js_file_share_input');
    var uploadIds = uploader.upload(sharedFile, sentMessage);

    var messageTime = moment(Date.now()).format('hh:mm a');

    fileClass = 'file_msg';
        
    seenIndicator = `<img class="js_chatBox_seen_indicator not-seen_indicator" src="/images/icons/not_sent.svg">`;

    var messageDiv = `<div class="chatbox_msgbox own_msgbox" id="${messageId}"><span>${seenIndicator}</span><div class="chatbox_msg own_msg ${fileClass}"><div>${fileName}</div><div class="progress_bar_wrapper"><div id="js_file_upload_progress_bar" class="progress_bar"></div></div></div><div class="chatbox_msg-time">${messageTime}</div><div class="icon-container own_msg-icon-container"><img class="icon-container_icon chatbox_remove-icon" src="/images/icons/garbage.svg"></div></div>`;

    $('#js_chatbox').append(messageDiv);

    $('#js_chatbox').stop().animate({
        scrollTop: $("#js_chatbox")[0].scrollHeight
    }, 800);
});

// active user update
socket.on('activeUserUpdate', function(userId) {
    $($(`*[data-userid="${userId}"]`).find('.inactive_user_indicator')).addClass('is-active_indicator');
    $($(`*[data-userid="${userId}"]`).find('.inactive_user_indicator')).removeClass('inactive_user_indicator');
})

// inactive user update
socket.on('inactiveUserUpdate', function(userId) {
    $($(`*[data-userid="${userId}"]`).find('.is-active_indicator')).addClass('inactive_user_indicator');
    $($(`*[data-userid="${userId}"]`).find('.is-active_indicator')).removeClass('is-active_indicator');
})


// initial chatbox update (loding message)
socket.on('initialChatboxMessages', function(messages) {
    messages.forEach(function(messageInfo) {
        loadMessage(messageInfo);
    })
})

// logout event
$('#js_logout_btn').click(function() {
    socket.emit('logout', userId);
})


// changes on user selection
$('#userlist').on('click', '.user', function() {
    var recieverId = $(this).attr('data-userid');
    var userName = $(this).attr('data-name');
    var userPicSrc = "/images/propics/" + recieverId + ".jpg";
    var userActiveStatus = $(this).attr('data-is-active');

    // changes in user list 
    $('.user').removeClass('active');
    $(this).addClass('active');
    socket.emit('chatBoxUpdateOnUserChange', {userId, recieverId});
    socket.emit('seenMessagesUpadate', {senderId: recieverId, recieverId: userId});
    socket.emit('chatBoxSeenMessageUpdate', recieverId);
    $($(this).find('.user_name')).removeClass('not_read_msg');
    $($(this).find('.user_msg')).removeClass('not_read_msg');

    // changes in Info list
    $('#js_info_pic').attr('src', userPicSrc);
    $('#js_info_name').text(userName.toLowerCase());

    // changes in navbar
    $('#js_navbar_profile_pic').attr('src', userPicSrc);
    $('#js_navbar_profile_pic').attr('alt', userName);
    $('#js_navbar_profile_name').text(userName.toLowerCase());
    $('.navbar_chatbox-portion_user-details').attr('id', recieverId)

    if (userActiveStatus == "true") {
        $('#js_navbar_active_status').text("Active Now");
    } else {
        $('#js_navbar_active_status').text("");
    }
    
})

// seen message update
socket.on('chatBoxSeenMessageUpdateToSender', function() {
    chatBoxSeenUpdate();
})

// chatbox update on user change
socket.on('chatboxMessagesOnUserChange', function(messages) {
    $('#js_chatbox').empty();
    messages.forEach(function(messageInfo) {
        loadMessage(messageInfo);
    })
})

// userlist update when user is changed or new message come
socket.on('userlistUpdate', function(userList) {
    updateUserList(userList);
})

// update userlist after sending or recieving new message
function updateUserList(userList) {
    $('#userlist').empty();
    userList.forEach((user) => {
        if (user.lastMsgTime == "") {
            user.lastMsgTime = "1970-01-01T22:21:55.984Z";
        } else {
        }
    })

    // sorting user based on last message
    userList.sort((a, b) => (a.lastMsgTime > b.lastMsgTime) ? -1 : 1);

    userList.forEach((user, index) => {
        let name = user.name.toLowerCase();
        let lastMsgTime;
        let message, isReadClass = '', isActiveClass = '', isSeenClass = '', isSeenImgSrc = '';

        if(user.lastMsgIsYours) {

            if (user.messageType == "file") {
                message = 'You: File';
            } else {
                message = `You: ${doDecryption(user.lastMsg)}`;
            }
            
            if (user.lastMsgTime != "1970-01-01T22:21:55.984Z") {
                lastMsgTimeStyle = `style="opacity: 1;"`
            } else {
                lastMsgTimeStyle = `style="opacity: 0;"`
            }
            
        } else {

            if (user.messageType == "file") {
                message = 'You: File';
            } else {
                message = `${doDecryption(user.lastMsg)}`;
            }

            lastMsgTimeStyle = `style="opacity: 0;"`

            if(user.isRead || message == "") {
                isReadClass = '';
            } else {
                isReadClass = 'not_read_msg';
            }
        }

        if(user.isActive) {
            isActiveClass = `is-active_indicator`;
        } else {
            isActiveClass = ``;
        }

        if(user.isSeen) {
            isSeenClass = `seen_indicator`;
            isSeenImgSrc = `seen.svg`;
        } else {
            isSeenClass = `not-seen_indicator`;
            isSeenImgSrc = `not_seen.svg`;
        }

        if (user.lastMsgTime != "") {
            lastMsgTime = moment(user.lastMsgTime.toString()).format('hh:mm a');
        } else {
            lastMsgTime = "1970-01-01T22:21:55.984Z";
        }

        //initial userlist update
        let userDiv = `<div class='user' data-userid="${user.userId}" data-name="${user.name.toLowerCase()}" data-is-active="${user.isActive}"><div class='user_pic-container'><img src='/images/propics/${user.userId}.jpg'></div><div class="user_info-container"><span class="user_name ${isReadClass}">${name.toLowerCase()}<span class="${isActiveClass}"></span></span><span class="user_msg ${isReadClass}">${message}</span></div><div class="user_confirmation-time-container"><span><img class="${isSeenClass}" ${lastMsgTimeStyle} src="/images/icons/${isSeenImgSrc}"></span><span class="msg_time"> <span class="circle" ${lastMsgTimeStyle}></span>${lastMsgTime}</span></div>`;

        $('#userlist').append(userDiv);

    });

    var activeUserTabId = $('.navbar_chatbox-portion_user-details').attr('id');
    $(`*[data-userid="${activeUserTabId}"]`).addClass('active');
}

// changes on info selection
$('#js_user_info_btn').click(function() {

    if ($(this).attr('data-active') == 0) {
        $(this).css({'transform': 'scale(1.1)', 'background-color': '#FFE9EA'});
        $('#js_chatbox').css('right', '24%');
        $('#js_chatbox_sendmsg-form').css('right', '24%');
        $(this).attr('data-active', 1);
    } else {
        $(this).css({'transform': 'scale(1)', 'background-color': 'transparent'});
        $('#js_chatbox').css('right', '0');
        $('#js_chatbox_sendmsg-form').css('right', '0');
        $(this).attr('data-active', 0);
    }
})


// message loading function
function loadMessage(messageInfo) {
    var seenIndicator, fileClass, downloadClass = '', filePicShow = '';
    var messageTime = moment(messageInfo.messageTime.toString()).format('hh:mm a');
    var message = doDecryption(messageInfo.message);
    var fileDownloadLink = message;
    var messageId = messageInfo._id;

    if(messageInfo.messageType == 'file') {
        fileClass = 'file_msg';
        message = message.split('---');
        message = message[message.length - 1];
        fileDownloadLink = fileDownloadLink.replace(/ /g, "%20");
        downloadClass = `<a href="/download/${fileDownloadLink}" class="icon-container file_download_icon"><img class="icon-container_icon chatbox_remove-icon" src="/images/icons/download.svg"></a href="">`;
        filePicShow = `background-image: url(./sharedFiles/${fileDownloadLink})`;
    } else {
        fileClass = '';
    }

    if(messageInfo.senderId == userId) {
        
        if(messageInfo.isSeen) {
            seenIndicator = `<img class="js_chatBox_seen_indicator seen_indicator" src="/images/icons/seen.svg">`;
        } else {
            seenIndicator = `<img class="js_chatBox_seen_indicator not-seen_indicator" src="/images/icons/not_seen.svg">`;
        }

        var messageDiv = `<div class="chatbox_msgbox own_msgbox" id="${messageId}"><span>${seenIndicator}</span><div class="chatbox_msg own_msg ${fileClass}" style="${filePicShow}">${message} ${downloadClass}</div><div class="chatbox_msg-time">${messageTime}</div><div class="icon-container own_msg-icon-container"><img class="icon-container_icon chatbox_remove-icon" src="/images/icons/garbage.svg"></div></div>`;

    } else {

        var messageDiv = `<div class="chatbox_msgbox frnds_msgbox" id="${messageId}"><div class="chatbox_msg frnds_msg ${fileClass}" style="${filePicShow}">${message} ${downloadClass}</div><div class="chatbox_msg-time">${messageTime}</div><div class="icon-container frnds_msg-icon-container"><img class="icon-container_icon chatbox_remove-icon" src="/images/icons/garbage.svg"></div></div>`;
    }

    $('#js_chatbox').append(messageDiv);

    $('#js_chatbox').stop().animate({
        scrollTop: $("#js_chatbox")[0].scrollHeight
    }, 800);
}


// chatbox seen indicator update
function chatBoxSeenUpdate() {
    $('.js_chatBox_seen_indicator.not-seen_indicator').addClass('seen_indicator');
    $('.js_chatBox_seen_indicator.not-seen_indicator').removeClass('not-seen_indicator');
    $('.js_chatBox_seen_indicator').attr('src', '/images/icons/seen.svg');
}

// send messages configuration
var sendMsgForm = $('#js_chatbox_sendmsg-form');
var sendMsgBtn = $('#js_chatbox_sendmsg-btn');

sendMsgBtn.click(function(){
    sendMsgForm.submit();
})

sendMsgForm.submit(function(e) {
    e.preventDefault();

    let recieverId = $('.navbar_chatbox-portion_user-details').attr('id');
    let selfUserId = $('.navbar').attr('id');
    let sentMessage = $('#js_sendmsg-input').val();
    let messageType = 'message';

    if(sentMessage != "") {
        sentMessage = doEncryption(sentMessage);
        socket.emit('saveMessageInServerDB', {selfUserId, recieverId, messageType, sentMessage});
    }

    $('#js_sendmsg-input').val('');
})

socket.on('newMessageFromOtherToSender', function(messageInfo) {
    var userNavId = $('.navbar_chatbox-portion_user-details').attr('id');
    
    if(userNavId == messageInfo.senderId) {
        
        loadMessage(messageInfo);
        socket.emit('seenMessagesUpadate', {senderId: messageInfo.senderId, recieverId: messageInfo.recieverId});
        socket.emit('chatBoxSeenMessageUpdate', messageInfo.senderId);
    }
});

socket.on('confirmationOfsavingMessageToSender', function(messageInfo) {
    var userNavId = $('.navbar_chatbox-portion_user-details').attr('id');

    if(userNavId == messageInfo.recieverId) {
        
        loadMessage(messageInfo);
    }
});

// encryption function
function doEncryption(messageToEncrypt, key = "5d6f05fb1004e43b14321d11") {
    var encryptedMessage = CryptoJS.AES.encrypt(messageToEncrypt, key);
    return encryptedMessage.toString(); //it's very important. Will cause error if it is not done
}

function doDecryption(messageToDecrypt, key = "5d6f05fb1004e43b14321d11") {
    var decryptedMessage = CryptoJS.AES.decrypt(messageToDecrypt, key).toString(CryptoJS.enc.Utf8);
    return decryptedMessage;
}




