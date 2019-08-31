$('.user').click(function() {
    var userId = $(this).attr('data-userId');
    var userName = $(this).attr('data-name');
    var userPicSrc = "/images/propics/" + userId + ".jpg";
    var userActiveStatus = $(this).attr('data-is-active');

    // changes is user list 
    $('.user').removeClass('active');
    $(this).addClass('active');

    // changes in navbar
    $('#js_navbar_profile_pic').attr('src', userPicSrc);
    $('#js_navbar_profile_pic').attr('alt', userName);
    $('#js_navbar_profile_name').text(userName);
    if (userActiveStatus == "\"true\"") {
        $('#js_navbar_active_status').text("Active Now");
        console.log(userActiveStatus)
    } else {
        $('#js_navbar_active_status').text("");
        console.log(userActiveStatus)
    }
    
})


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