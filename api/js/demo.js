$(document).ready(function () {
  var upload_response = $("#upload_response");
  var cumulative_response = $('#cumulative_response');
  $(".json-response").hide();


  // Here is how to show an error message next to a form field

  //  var errorField = $('.form-input-name-row');

  // Adding the form-invalid-data class will show
  // the error message and the red x for that field

  //      errorField.addClass('form-invalid-data');
  //      errorField.find('.form-invalid-data-info').text('Please enter your name');


  // Here is how to mark a field with a green check mark

  var successField = $('.form-input-name-row');

  successField.on('change paste keyup', function () {
    if ($(this).find('input').val() != '') {
      $(this).addClass('form-valid-data');
    } else {
      $(this).removeClass('form-valid-data');

    }
  });


  var upper_window = $("input[name=upper_window]");
  var lower_window = $("input[name=lower_window]");
  var upper_var = $("input[name=upper_range]");
  var lower_var = $("input[name=lower_range]");
  var var_name = $("input[name=var_name]");
  var token = $("input[name=token]");


  var base_url = "http://prove-it-unsw.herokuapp.com/api/v1"

  //  upper_window.on('change paste keyup',function(){
  //    console.log($(this).val());
  //  });
  //  
  $("#upload_form").submit(function (event) {
    event.preventDefault();

    upload_response.empty();
    upload_response.show();
    upload_response.html("Processing ...");

    $.ajax({
      url: base_url + "/event-study/submit-files",
      type: 'POST',
      data: new FormData(this),
      processData: false,
      contentType: false,
      complete: function (data) {
        console.log(data);
        upload_response.show();
        upload_response.empty();
        upload_response.text(JSON.stringify(data.responseJSON , undefined, 2));
      },
    });
    return false;
  });



  $("#cumulative-return-form").submit(function (event) {
    event.preventDefault();

    cumulative_response.empty();
    cumulative_response.show();
    cumulative_response.html("Processing ...");

    var data = {
      upper_window: upper_window.val(),
      lower_window: lower_window.val(),
      topic_upper_range : upper_var.val(),
      topic_lower_range : lower_var.val(),
      topic_name : var_name.val(),
      token: token.val(),
    };

    $.ajax({
      url: base_url + "/event-study/cumulative-returns",
      type: 'GET',
      data: data,
      processData: true,
      complete: function (data) {
        console.log(data.responseText);
        cumulative_response.empty();
        cumulative_response.show();
        cumulative_response.text(JSON.stringify(data.responseJSON, undefined, 2));
      },
    });

    //    var url = base_url + "/event-study/cumulative-returns";
    //    url = "https://prove-it-unsw.herokuapp.com/api/v1/event-study/cumulative-returns";
    //    $.get(url, {
    //        upper_window: "678",
    //        lower_window: "9",
    //      },
    //      function (data) {
    //        console.log(data);
    //      }
    //    );
    return false;
  });


  // Our labels and three data series
  var data = {
      // A labels array that can contain any sort of values
      labels: ['a','b','c','d','e','f','d','e','f','g','h','i'],
      // Our series array that contains series objects or in this case series data arrays
      series: [
        [null, null, null, 0, 0, 0, 0, 0.0135, 0.0135, 0.01018, 0.01352]
      ]
  };

  var options = {
    // Disable line smoothing
    lineSmooth: false,
    width: 900,
    height: 700
  };

  // Create a new line chart object where as first parameter we pass in a selector
  // that is resolving to our chart container element. The Second parameter
  // is the actual data object.
  new Chartist.Line('.ct-chart', data, options);




});