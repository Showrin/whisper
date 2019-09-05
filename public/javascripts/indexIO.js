const userId = $('.navbar').attr('id');

// save socket in server
socket.emit('saveSocket', userId);

// initial update at the time of loading the page
socket.emit('fetchInitialUpdateOnPageLoad', userId);
socket.on('initialUpdateOnPageload', function(userList) {
    
    userList.forEach((user, index) => {
        if (user.lastMsgTime != "") {
            user.order = index - userList.length;
        } else {
            user.order = 1;
        }
    })

    // sorting user based on last message
    userList.sort((a, b) => (a.messageTime > b.messageTime) ? 1 : -1);
    userList.sort((a, b) => (a.order > b.order) ? 1 : -1);

    userList.forEach((user, index) => {
        let name = user.name;
        let lastMsgTime;
        let message, isReadClass, isActiveClass, isSeenClass, isSeenImgSrc, activeTabClass, order;
        console.log(user)
        if(index == 0) {
            activeTabClass = 'active';
        } else {
            activeTabClass = '';
        }

        if(user.lastMsgIsYours) {
            message = `You: ${user.lastMsg}`;
            console.log(message)
        } else {
            message = `${user.lastMsg}`;
            console.log(message)

            if(user.isRead) {
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
            lastMsgTimeStyle = `style="opacity: 0;"`
            order = index - userList.length; //returns a negative number
        } else {
            lastMsgTime = "";
            lastMsgTimeStyle = `style="opacity: 0;"`
            order = 1;
        }

        //initial userlist update
        let userDiv = `<div class='user ${activeTabClass}' style="order: ${order}" data-userid="${user.userId}" data-name="${user.name}" data-is-active="${user.isActive}"><div class='user_pic-container'><img src='/images/propics/${user.userId}.jpg'></div><div class="user_info-container"><span class="user_name ${isReadClass}">${name}<span class="${isActiveClass}"></span></span><span class="user_msg ${isReadClass}">${message}</span></div><div class="user_confirmation-time-container"><span><img class="${isSeenClass}" ${lastMsgTimeStyle} src="/images/icons/${isSeenImgSrc}"></span><span class="msg_time"> <span class="circle" ${lastMsgTimeStyle}></span>${lastMsgTime}</span></div>`;

        $('#userlist').append(userDiv);

        if (index == 0) {
            //initial navbar update
            $('#js_navbar_profile_pic').attr('src', `/images/propics/${user.userId}.jpg`);
            $('#js_navbar_profile_name').text(user.name);
            $('.navbar_chatbox-portion_user-details').attr('id', user.userId)
    
            if(user.isActive) {
                $('#js_navbar_active_status').text('Active now');
            } else {
                $('#js_navbar_active_status').text('');
            }

            // initial info page update
            $('#js_info_pic').attr('src', `/images/propics/${user.userId}.jpg`);
            $('#js_info_name').text(user.name);

            // initial chatbox update (request for message)
            let senderId = userId;
            let recieverId = user.userId;
            socket.emit('initialChatboxMessagesUpdate', {senderId, recieverId}); 
            
        }

    });
   
})

// initial chatbox update (loding message)
socket.on('initialChatboxMessages', function(messages) {
    messages.forEach(function(messageInfo) {
        loadMessage(messageInfo);
    })
})


// changes on user selection
$('#userlist').on('click', '.user', function() {
    var userId = $(this).attr('data-userid');
    var userName = $(this).attr('data-name');
    var userPicSrc = "/images/propics/" + userId + ".jpg";
    var userActiveStatus = $(this).attr('data-is-active');

    // changes is user list 
    $('.user').removeClass('active');
    $(this).addClass('active');

    // changes in Info list
    $('#js_info_pic').attr('src', userPicSrc);
    $('#js_info_name').text(userName);

    // changes in navbar
    $('#js_navbar_profile_pic').attr('src', userPicSrc);
    $('#js_navbar_profile_pic').attr('alt', userName);
    $('#js_navbar_profile_name').text(userName);
    $('.navbar_chatbox-portion_user-details').attr('id', userId)

    if (userActiveStatus == "true") {
        $('#js_navbar_active_status').text("Active Now");
    } else {
        $('#js_navbar_active_status').text("");
    }
    
})

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
    var seenIndicator;
    var messageTime = moment(messageInfo.messageTime.toString()).format('hh:mm a');
    var message = messageInfo.message;
    var messageId = messageInfo._id;

    if(messageInfo.senderId == userId) {
        
        if(messageInfo.isSeen) {
            seenIndicator = `<img class="seen_indicator" src="/images/icons/seen.svg">`;
        } else {
            seenIndicator = `<img class="not-seen_indicator" src="/images/icons/not_seen.svg">`;
        }

        var messageDiv = `<div class="chatbox_msgbox own_msgbox" id="${messageId}"><span>${seenIndicator}</span><div class="chatbox_msg own_msg">${message}</div><div class="chatbox_msg-time">${messageTime}</div><div class="icon-container own_msg-icon-container"><img class="icon-container_icon chatbox_remove-icon" src="/images/icons/garbage.svg"></div></div>`;

    } else {
        var messageDiv = `<div class="chatbox_msgbox frnds_msgbox" id="${messageId}"><div class="chatbox_msg frnds_msg">${message}</div><div class="chatbox_msg-time">${messageTime}</div><div class="icon-container frnds_msg-icon-container"><img class="icon-container_icon chatbox_remove-icon" src="/images/icons/garbage.svg"></div></div>`;
    }

    $('#js_chatbox').append(messageDiv);

    $('#js_chatbox').stop().animate({
        scrollTop: $("#js_chatbox")[0].scrollHeight
    }, 800);
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

    socket.emit('saveMessageInServerDB', {selfUserId, recieverId, messageType, sentMessage});

    $('#js_sendmsg-input').val('');

    console.log(recieverId +'\n'+ selfUserId +'\n'+ sentMessage);
})

socket.on('newMessageFromOtherToSender', function(messageInfo) {
    loadMessage(messageInfo);
});

socket.on('confirmationOfsavingMessageToSender', function(messageInfo) {
    loadMessage(messageInfo);
});


