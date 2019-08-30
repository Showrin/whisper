function showIMG(input) {
    var reader = new FileReader();
    
    reader.onload = function(e) {
        $('#js_show_pro_pic')
            .attr('src', e.target.result);
    };

    reader.readAsDataURL(input.files[0]); 
}