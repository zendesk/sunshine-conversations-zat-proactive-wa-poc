$(function() {

  //Prevent clicking on Send without the required information
  $('#send').attr("disabled", true);

  function enableSend(){
  if($('#phone').val() != '' && $('#text').val() != ''){
    $('#send').attr("disabled", false);
    }else{
    $('#send').attr("disabled", true);
    }
  }
  $('#text').on('input',function(e){
    enableSend()
  });
  $('#phone').on('input',function(e){
    enableSend()
  });

  function buildDropDown(list, dropdown, empty){
    // Remove current options
    dropdown.html('');
    // Add the empty option with the empty message
    dropdown.append('<option value="">' + empty + '</option>');
    // Check result isnt empty
    var array = list.split(',');
    if(array.length > 0)
    {
        // Loop through each of the results and append the option to the dropdown
        $.each(array, function(index, value) {
            dropdown.append('<option value="' + value + '">' + value + '</option>');
        });
    }
  }
    
  // Initialise the Zendesk JavaScript API client
  // https://developer.zendesk.com/apps/docs/apps-v2
  var client = ZAFClient.init();
  client.invoke('resize', { width: '300px', height: '380px' });

  var appId, integrationId, namespace, templateNames, language, notificationAPI;

  $(document).ready(function() {

    //Fetch the app parameters
    client.metadata().then(function(meta) {
      appId = meta.settings['appId'];
      integrationId = meta.settings['integrationId'];
      namespace = meta.settings['namespace'];
      templateNames = meta.settings['templates'];
      language = meta.settings['language'];
      notificationAPI = true;
      
      buildDropDown(templateNames, $('#hsm'), "Select a template...");
    });    

    //Prepare and send notif
    $('#send').click(function(e) {
        var phone = $('#phone').val();
        var template_name = $('#hsm').val();
        if (notificationAPI == true){
          $('#title').text("Using Notification API");
          submitNotificationAPI(phone, template_name);
        }else{
          $('#title').text("Using Conversation API");
          precreateAppUser(phone,template_name);
        }
      });

    //Call to the Notification API
    function submitNotificationAPI(phone, template_name) {

      console.log("submitNotificationAPI");

      var param = [$('#p1').val(), $('#p2').val(), $('#p3').val(), $('#p4').val(), $('#p5').val()];
      var localizable_params = [];
      param.forEach(function(lp, index) {
        if (lp) {
            var p = {};
            p.default = lp;
            localizable_params.push(p);
        }
      });

      //console.log(JSON.stringify(localizable_params));

      var data = {
        "destination": {
            "integrationId": integrationId,
            "destinationId": phone
        },
        "author": {
            "role": "appMaker"
        },
        "messageSchema": "whatsapp",
        "message": {
            "type": "hsm",
            "hsm": {
                "namespace": namespace,
                "element_name": template_name,
                "language": {
                    "policy": "fallback",
                    "code": language
                },
                "localizable_params": localizable_params
            }
        }
    }

    //console.log(JSON.stringify(data));

      var settings = {
        url: 'https://api.smooch.io/v1.1/apps/'+appId+'/notifications',
        headers: {"Authorization": "Bearer {{setting.jwt}}"},
        //headers: {"Authorization": "Bearer " + jwt }, //for live debugging
        secure: true,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data)
      };

      client.request(settings).then(function(response) {
        console.log(response);
        $('#api_response').text(JSON.stringify(response));
      })
      .catch(function(err) {
        console.log(err);
        $('#api_response').text(JSON.stringify(err));
      });
    }

    /*
    //Call to the Conversation API - createUser
    function precreateAppUser(phone,template_name) {
      //Precreate AppUser (if already exist it will generate a 409 error but.. whatever)
      var data = {
        "userId": phone
      }

      var settings = {
        url: 'https://api.smooch.io/v1.1/apps/'+appId+'/appusers',
        headers: {"Authorization": "Bearer {{setting.jwt}}"},
        secure: true,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data)
      };

      client.request(settings).then(function(response) {
        console.log(response);
        $('#api_response').text(JSON.stringify(response));
        $('#api_precreate').text("User created");
        linkAppUserToWAChannel(phone,template_name);
      })
      .catch(function (err) {
        console.log(err);
        $('#api_response').text(JSON.stringify(err));
        $('#api_precreate').text("User creation issue - Click here to link to WA anyway");
        $('#api_precreate').click(function(e) {
          $('#api_precreate').text("User creation issue - Linking to WA...");
          linkAppUserToWAChannel(phone,template_name);
        });
      });
    }


    //Call to the Conversation API - link to Channel
    function linkAppUserToWAChannel(phone,template_name) {
      //Link user to channel: if the number is linked to another appUser, it will move the link
      var data={
        "type": "whatsapp",
        "phoneNumber": phone,
        "confirmation": {
          "type": "immediate"
        }
      }

      var settings = {
        url: 'https://api.smooch.io/v1.1/apps/'+appId+'/appusers/'+phone+'/channels',
        headers: {"Authorization": "Bearer {{setting.jwt}}"},
        secure: true,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data)
      };

      client.request(settings).then(function(response) {
        console.log(response);
        $('#api_response').text(JSON.stringify(response));
        $('#api_link').text("User linked to WA");
        //Wait for the link result
        
        //Send the message
        sendHSM(phone,template_name);
      })
      .catch(function (err) {
        console.log(err);
        $('#api_response').text(JSON.stringify(err));
        $('#api_link').text("Linking issue - Click here to send the HSM anyway");
        $('#api_link').click(function(e) {
          //Send the message
          $('#api_link').text("Linking issue - Sending HSM...");
          sendHSM(phone,template_name);
        });
      });
    }

    //Call to the Conversation API - send HSM
    function sendHSM(phone,template_name) {
      
      var param = [$('#p1').val(), $('#p2').val(), $('#p3').val(), $('#p4').val(), $('#p5').val()];
      var localizable_params = [];
      param.forEach(function(lp, index) {
        if (lp) {
            var p = {};
            p.default = lp;
            localizable_params.push(p);
        }
      });
      //console.log(JSON.stringify(localizable_params));

      var data = {
        "role": "appMaker",
        "destination": {
            "integrationType": "whatsapp",
            // per https://docs.smooch.io/rest/#channel-targeting
            // you may want to wait+retry if you get an error
        },
        "messageSchema": "whatsapp",
        "message": {
            "type": "hsm",
            "hsm": {
                "namespace": namespace,
                "element_name": template_name,
                "language": {
                    "policy": "fallback",
                    "code": language
                },
                "localizable_params": localizable_params
            }
        }
      }
      //console.log(JSON.stringify(data));

      var settings = {
        url: 'https://api.smooch.io/v1.1/apps/'+appId+'/appusers/'+phone+'/messages',
        headers: {"Authorization": "Bearer {{setting.jwt}}"},
        secure: true,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data)
      };

      client.request(settings).then(function(resp) {
        console.log(resp);
        $('#api_response').text(JSON.stringify(response));
        $('#api_send').text('<h1>Done!</h1>');
      })
      .catch(function (err) {
        console.log(err);
        $('#api_response').text(JSON.stringify(err));
        $('#api_send').text('Done.');
      });
    }
  */
  });
});
