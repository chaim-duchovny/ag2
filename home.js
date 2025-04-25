$(document).ready(function() {
    $('#subscribeForm').submit(function(event) {
        event.preventDefault(); // Prevent the default form submission
        var email = $('#email_field').val();

        $.ajax({
            url: '/home.html', // or the correct path
            type: 'POST',
            data: { email: email },
            success: function(response) {
                $('#message').html('<span style="color: green;">Email added successfully</span>');
            },
            error: function(xhr, status, error) {
                if (xhr.status === 409) {
                    $('#message').html('<span style="color: red;">This Email exists</span>');
                } else {
                    $('#message').html('<span style="color: red;">Error: ' + xhr.responseText + '</span>');
                }
            }
        });
    });
    });