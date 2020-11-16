// 1. This implements most of the code, watching for slash commands, sets up event handling for various scenarios:
//   a) /fqscores  =  display the table
//   b) /fqscores @user number - updates the db table adding the number to the users existing score or adding the user
//    if they don't already exist
//   c) /fqscores @user :emoji: - updates the db table adding the emoji to the users existing emoji array or adding the user
//    if they don't already exist
// 2) any other command gives the user an error
// 3) running the command in any channel other than #friday-question gives the user an error
"use strict";

// require('newrelic');

const ts = require('./src/tinyspeck.js'),
  users = {},
  datastore = require("./src/datastore.js").async,
  RtmClient = require('@slack/client').RtmClient

require('dotenv').config();

var slack = ts.instance({});
var connected = false;
var message;

var twss = require('./src/twss.js');

// receive the /fqscores command and process it
slack.on('/fqscores', payload => {
  console.log("Received /fqscores slash command from user " + payload.user_id);

  // get all the data items we're interested - username, points, emoji, comments
  let channel = payload.channel_name;
  let user_id = payload.user_id;
  let user_name = payload.user_name;
  let response_url = payload.response_url;

  let text = payload.text;
  let splitText = text.split(" ");
  let userAwardedPoints = splitText[0].toLowerCase();
  let pointsAwarded = splitText[1];
  let comment = '';

  for (var i = 2; i < splitText.length; i++) {
    comment = comment + ' ' + splitText[i];
  }

  if (channel === "fridayquestion") {
    if (userAwardedPoints === '') {
      console.log("displaying table");
      getConnected() // make sure we have a database connection
        .then(function() {
          datastore.getAll(function(result) {
            let message = getResults(result, user_name);
            slack.send(response_url, message).then(res => { // on success
              console.log("Response sent to /fqscores slash command");
            }, reason => { // on failure
              console.log("An error occurred when responding to /fqscores slash command: " + reason);
            });
          });
        });
      } else if (typeof(pointsAwarded) == "string" && pointsAwarded.charAt(0) == ':' && pointsAwarded.charAt(pointsAwarded.length - 1) == ':') {
        console.log("adding emoji");

        let message = Object.assign({
          "response_type": "in_channel",
          text: userAwardedPoints + " has been awarded a " + pointsAwarded + " by @" + payload.user_name + comment
        });

        console.log("message: " + message);

        getConnected() // make sure we have a database connection
          .then(function() {

            datastore.setEmoji(userAwardedPoints, pointsAwarded);

            datastore.get(userAwardedPoints)
              .catch(function(e) {
                if (e.type = "DatastoreDataParsingException") {
                  datastore.setScore(userAwardedPoints, 0);
                }
              });

            slack.send(response_url, message).then(res => { // on success
              console.log("Response sent to /fqscores slash command");
            }, reason => { // on failure
              console.log("An error occurred when responding to /fqscores slash command: " + reason);
            });
          });
    } else if (isNaN(pointsAwarded) == false) {
      console.log("updating points for user");

      getConnected() // make sure we have a database connection
        .then(function() {
          datastore.get(userAwardedPoints) // get the count for the user_id
            .then(function(score) {
              let message = Object.assign({
                "response_type": "in_channel",
                text: userAwardedPoints + " has been awarded " + Number(pointsAwarded).toLocaleString() + " points by @" + payload.user_name + comment
              });

              console.log("message: " + message);

              let newScore = Number(score) + Number(pointsAwarded);

              datastore.setScore(userAwardedPoints, newScore);

              slack.send(response_url, message).then(res => { // on success
                console.log("Response sent to /fqscores slash command");
              }, reason => { // on failure
                console.log("An error occurred when responding to /fqscores slash command: " + reason);
              });
            });
        });
    } else {
      console.log("invalid instruction");

      let message = Object.assign({
        text: "Sorry. That's not a valid instruction. Try a little harder next time. (That's what she said.)"
      });

      slack.send(response_url, message).then(res => { // on success
        console.log("Response sent to /fqscores slash command");
      }, reason => { // on failure
        console.log("An error occurred when responding to /fqscores slash command: " + reason);
      });
    }

  } else {

    let message = Object.assign({
      text: "This command only works in the #fridayquestion channel. If you would like to know more, come and talk to us. We're a friendly bunch."
    });

    slack.send(response_url, message).then(res => { // on success
      console.log("Response sent to /fqscores slash command");
    }, reason => { // on failure
      console.log("An error occurred when responding to /fqscores slash command: " + reason);
    });

    console.log("not fq");
  }
});

function getResults(result, user_name) {
  var resultText = "*The Friday Question Scores, as requested by @" + user_name + ":*\n";

  for (var i = 0; i < result.length; i++) {
    var obj = result[i];
    resultText = resultText + (i + 1) + ". " + obj.name + ": " + Number(obj.score).toLocaleString();

    if (typeof(obj.emojis) != "undefined") {
      resultText = resultText + " and";
      for (var j = 0; j < obj.emojis.length; j++) {
        resultText = resultText + " " + obj.emojis[j];
      }
    }

    resultText = resultText + "\n";
  }

  return Object.assign({
    "response_type": "in_channel",
    text: resultText
  });
}

function getConnected() {
  return new Promise(function(resolving) {
    if (!connected) {
      connected = datastore.connect().then(function() {
        resolving();
      });
    } else {
      resolving();
    }
  });
}

// let rtm = new RtmClient(process.env.SLACK_API_TOKEN, {
//   logLevel: 'error',
//   useRtmConnect: true,
//   dataStore: false,
//   autoReconnect: true,
//   autoMark: true
// });
//
// rtm.start();
//
// rtm.on('connected', () => {
//   console.log('Connected!');
// });

// incoming http requests
slack.listen(process.env.PORT || '3000');
