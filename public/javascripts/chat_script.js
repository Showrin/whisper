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
    $('#js_navbar_profile_name').text(userName);
    if (userActiveStatus == "\"true\"") {
        $('#js_navbar_active_status').text("Active Now");
        console.log(userActiveStatus)
    } else {
        $('#js_navbar_active_status').text("");
        console.log(userActiveStatus)
    }
    
})