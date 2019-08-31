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
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;
let usernameRegex = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z ]*)*$/;
let isPasswordError = true, isEmailError = true, isNameError = true;

username.keyup(function() {
    if (validator.isEmpty(username.val())) {
        $('#js_name_error_msg').text('Please give your name');
        isNameError = true;
    } else {
        if (!validator.matches(username.val(), usernameRegex)) {
            $('#js_name_error_msg').text('Name must contain only alphabet');
            isNameError = true;
        } else {
            $('#js_name_error_msg').text('');
            isNameError = false;
        }
    }
})

email.keyup(function() {
    if (validator.isEmpty(email.val())) {
        $('#js_email_error_msg').text('Please give your email');
        isEmailError = true;
    } else {
        if (!validator.isEmail(email.val())) {
            $('#js_email_error_msg').text('Please give a valid email');
            isEmailError = true;
        } else {
            $('#js_email_error_msg').text('');
            isEmailError = false;
        }
    }
})

password.keyup(function() {
    if (validator.isEmpty(password.val())) {
        $('#js_password_error_msg').text('Please give your password');
        isPasswordError = true;
    } else {
        if (!validator.matches(password.val(), passwordRegex)) {
            $('#js_password_error_msg').text('Password must contain at least 8 characters, at least one upper case and lower case letter and digit');
            isPasswordError = true;
        } else {
            $('#js_password_error_msg').text('');
            isPasswordError = false;
        }
    }
})

$('#js_signup_form').submit(function(e){
    e.preventDefault();
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
    }

})

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

// modal and dimmer control
$('.modal_btn--close, .dimmer').click(() => {

    $('.modal').css('transform', 'scale(0)');

    $('.dimmer').css('opacity', '0');
    setTimeout(() => {
        $('.dimmer').css('display', 'none');
    }, 300);
})



const socket = io.connect();