// socket connection
const socket = io.connect();

// showing uploaded pic during signup process
function showIMG(input) {
    var reader = new FileReader();
    
    reader.onload = function(e) {
        $('#js_show_pro_pic')
            .attr('src', e.target.result);
    };

    reader.readAsDataURL(input.files[0]); 
}

// signup validation
let profilePic = $('#js_pro_pic');
let username = $('#name');
let email = $('#email');
let password= $('#password');
let retypePassword= $('#retypePassword');
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;
let usernameRegex = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z ]*)*$/;
let isPasswordError = true, isRetypePasswordError = true, isEmailError = true, isNameError = true;

username.keyup(function() {
    userNameCheck(username);
});

email.keyup(function() {
    emailCheck(email);
});

password.keyup(function() {
    passwordCheck(password)
});

retypePassword.keyup(function() {
    retypePasswordCheck(retypePassword)
});

socket.on('emailIsAvailable', function() {
    $('#js_email_error_msg').text('');
    isEmailError = false;
})

socket.on('emailIsNotAvailable', function() {
    $('#js_email_error_msg').text('This email is already registered');
    isEmailError = true;
})


$('#js_signup_btn').click(function(e){
    e.preventDefault();
    userNameCheck(username);
    emailCheck(email);
    passwordCheck(password);
    retypePasswordCheck(retypePassword);

    var profilePicExtension = profilePic.val().substring(profilePic.val().lastIndexOf('.') + 1).toLowerCase();

    if (validator.isEmpty(profilePic.val())) {
        openProfilePicErrorModal();
    } else if (!(profilePicExtension == "png" || profilePicExtension == "jpeg" || profilePicExtension == "jpg")) {
        openProfilePicErrorModal();
    } else if (isNameError) {
        username.focus();
    } else if (isEmailError) {
        email.focus();
    } else if (isPasswordError) {
        password.focus();
    } else if (isRetypePasswordError) {
        retypePassword.focus();
    } else {   
        // password encryption
        passwordKey = encryptionKeyGenerator(password.val());
        encryptedPass = sjcl.encrypt(passwordKey.toString(), password.val());
        password.val(encryptedPass);
        retypePassword.val(encryptedPass);

        $('#js_signup_form').submit();

        username.val('');
        email.val('');
        password.val('');
        retypePassword.val('');
        profilePic.attr('src', '/images/icons/user.svg');
    }

})


// signin validation
$('#js_login_form').submit(function(e) {
    e.preventDefault();
    let email = $('#login_email').val();
    let password = $('#login_password').val();

    // password encryption
    passwordKey = encryptionKeyGenerator(password);
    encryptedPass = sjcl.encrypt(passwordKey.toString(), password);
    
    
    socket.emit('loginCheck', {email, password});
})

socket.on('loginFailed', function() {
    openLoginErrorModal();
})

socket.on('loginSuccessful', function() {
    $('#login_password').val(encryptedPass);
    // $('#js_login_form').submit();
})

// logout functionality
$('#js_logout_btn').click(function() {
    window.location.href = '/logout';
})

// modal and dimmer control
$('.modal_btn--close, .dimmer').click(() => {

    $('.modal').css('transform', 'scale(0)');

    $('.dimmer').css('opacity', '0');
    setTimeout(() => {
        $('.dimmer').css('display', 'none');
    }, 300);
})


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


// ########################### FUNCTIONS ####################################

// opening of profile pic error modal
function openProfilePicErrorModal() {
    //to solve transition problem with display property
    //setTimeout function is used
    $('.dimmer').css('display', 'block');

        setTimeout(() => {
            $('.dimmer').css('opacity', '0.5');
        }, 30);

        $('.modal').css('transform', 'scale(1)');
}

// opening of Login error modal
function openLoginErrorModal() {
    //to solve transition problem with display property
    //setTimeout function is used
    $('.dimmer').css('display', 'block');

    setTimeout(() => {
        $('.dimmer').css('opacity', '0.5');
    }, 30);

    $('.modal').css('transform', 'scale(1)');
}

// validation functions
function retypePasswordCheck(retypePassword) {
    if (validator.isEmpty(retypePassword.val())) {
        $('#js_retype_password_error_msg').text('Please retype your password');
        isRetypePasswordError = true;
    } else {
        if (!validator.equals(retypePassword.val(), password.val())) {
            $('#js_retype_password_error_msg').text('Password is not matched');
            isRetypePasswordError = true;
        } else {
            $('#js_retype_password_error_msg').text('');
            isRetypePasswordError = false;
        }
    }
}

function passwordCheck(password) {
    if (validator.isEmpty(password.val())) {
        $('#js_password_error_msg').text('Please give your password');
        isPasswordError = true;
    } else {
        if (!validator.matches(password.val(), passwordRegex)) {
            $('#js_password_error_msg').text('Must contain at least 8 characters, one upper case and lower case letter and digit');
            isPasswordError = true;
        } else {
            $('#js_password_error_msg').text('');
            isPasswordError = false;
        }
    }
}

function emailCheck(email) {
    if (validator.isEmpty(email.val())) {
        $('#js_email_error_msg').text('Please give your email');
        isEmailError = true;
    } else {
        if (!validator.isEmail(email.val())) {
            $('#js_email_error_msg').text('Please give a valid email');
            isEmailError = true;
        } else {
            socket.emit('isAvailableEmail', email.val()); //send mail to server for checking availability
            $('#js_email_error_msg').text('');
            isEmailError = false;
        }
    }
}

function userNameCheck(username) {
    if (validator.isEmpty(username.val())) {
        $('#js_name_error_msg').text('Please give your name');
        console.log('has')
        isNameError = true;
    } else {
        if (!validator.matches(username.val(), usernameRegex)) {
            $('#js_name_error_msg').text('Name must contain only alphabet');
            console.log('usgfc')
            isNameError = true;
        } else {
            $('#js_name_error_msg').text('');
            isNameError = false;
        }
    }
}

// Key generator for password encryption
function encryptionKeyGenerator(strToEncrypt) {
    
    var pass = strToEncrypt;
    var key = 0;
    var size = [...pass].length;
    console.log([...pass]);
    [...pass].forEach((char, index) => {

        if(index%2 != 0) {
            var temp = 0;
            temp = temp + (size - index);
            temp = pass.charCodeAt(index) * temp;
            temp = temp % index;
            key = key + temp;
            console.log(index);
        } else {
            key = key + pass.charCodeAt(index);
            console.log(index);
        }
    });
    console.log(key);

    return key;
}