// 1. This implements most of the code, watching for slash commands, sets up event handling for various scenarios:
//   a) /fqscores  =  display the table
//   b) /fqscores @user number - updates the db table adding the number to the users existing score or adding the user
//    if they don't already exist
//   c) /fqscores @user :emoji: - updates the db table adding the emoji to the users existing emoji array or adding the user
//    if they don't already exist
// 2) any other command gives the user an error
// 3) running the command in any channel other than #friday-question gives the user an error
"use strict";

require ('newrelic');

const ts = require('./src/tinyspeck.js'),
    users = {},
    datastore = require("./src/datastore.js").async,
    RtmClient = require('@slack/client').RtmClient,
    RTM_EVENTS = require('@slack/client').RTM_EVENTS,
    MemoryDataStore = require('@slack/client').MemoryDataStore,
    CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS,
    RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;

require('dotenv').config();

var slack = ts.instance({});
var connected = false;
var message;

var twss = require('./src/twss.js');
var giphyApi = require('giphy-api')(process.env.GIPHY_API_KEY);

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

    console.log("splitText " + splitText);
    console.log("text " + text);
    console.log("comment " + splitText);
    console.log("user " + userAwardedPoints);
    console.log("points " + pointsAwarded);
    console.log("comment " + comment);

    // only allow this to be used in #friday-question
    if (channel === "fridayquestion") {

        // if we receive no parameters then display the scores table
        if (userAwardedPoints === '') {
            console.log("displaying table");

            getConnected() // make sure we have a database connection
                .then(function() {

                    // get all the scores from the database
                    datastore.getAll(function(result) {

                        let message = getResults(result, user_name);
                        console.log(result);
                        slack.send(response_url, message).then(res => { // on success
                            console.log("Response sent to /fqscores slash command");
                        }, reason => { // on failure
                            console.log("An error occurred when responding to /fqscores slash command: " + reason);
                        });
                    });
                });

        }

        // process an emoji
        else if (typeof(pointsAwarded) == "string" && pointsAwarded.charAt(0) == ':' && pointsAwarded.charAt(pointsAwarded.length - 1) == ':') {

            console.log("adding emoji");

            let message = Object.assign({
                "response_type": "in_channel",
                text: userAwardedPoints + " has been awarded a " + pointsAwarded + " by @" + payload.user_name + comment
            });

            console.log("message: " + message);

            getConnected() // make sure we have a database connection
                .then(function() {

                    datastore.setEmoji(userAwardedPoints, pointsAwarded);

                    slack.send(response_url, message).then(res => { // on success
                        console.log("Response sent to /fqscores slash command");
                    }, reason => { // on failure
                        console.log("An error occurred when responding to /fqscores slash command: " + reason);
                    });
                });
        }

        // process points
        else if (isNaN(pointsAwarded) == false) {
            console.log("updating points for user");

            getConnected() // make sure we have a database connection
                .then(function() {

                    // get the user's current score from the database
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
        }

        // anything else is invalid
        else {

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

    }
    else {

        let message = Object.assign({
            text: "This command only works in the #friday-question channel. If you would like to know more, come and talk to us. We're a friendly bunch."
        });

        slack.send(response_url, message).then(res => { // on success
            console.log("Response sent to /fqscores slash command");
        }, reason => { // on failure
            console.log("An error occurred when responding to /fqscores slash command: " + reason);
        });

        console.log("not fq");
    }

});



// build the results table
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

    console.log(resultText);

    return Object.assign({
        "response_type": "in_channel",
        text: resultText
    });

}

// connect to the database
function getConnected() {
    return new Promise(function(resolving) {
        if (!connected) {
            connected = datastore.connect().then(function() {
                resolving();
            });
        }
        else {
            resolving();
        }
    });
}

// let rtm = new RtmClient(process.env.SLACK_API_TOKEN, {
//     logLevel: 'error',
//     dataStore: new MemoryDataStore(),
//     autoReconnect: true,
//     autoMark: true
// });
//
// rtm.start();
//
// rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
//     console.log('Connected!');
// });
//
// rtm.on(RTM_EVENTS.MESSAGE, (message) => {
//
//     let channel = message.channel;
//     let text = message.text;
//     let user = message.user;
//     let type = message.type;
//     let subtype = message.subtype;
//     let thread_ts = message.thread_ts;
//     let ts = message.ts;
//
//     if (typeof(user) != "undefined") {  // ignore bot messages
//
//         console.log(">>>> channel: " + channel);
//         console.log(">>>> text: " + text);
//         console.log(">>>> user: " + user);
//         console.log(">>>> type: " + type);
//         console.log(">>>> subtype: " + subtype);
//         console.log(">>>> ts: " + ts);
//         console.log(">>>> thread_ts: " + thread_ts);
//
//         twss.threshold = 0.8;
//         let isTwss = twss.is(text);
//         let prob = twss.prob(text);
//
//         console.log("twss: " + prob);
//
//         if (isTwss) {
//
//             console.log("getting twss gif");
//
//             giphyApi.random({
//                 tag: 'thats-what-she-said-the-office-michael-scott',
//                 fmt: 'json'
//             }, function (err, res) {
//                   if (err) {
//                       console.log(err);
//                   }
//                   else {
//                       console.log(">>>>> got twss gif");
//                       console.log(res.data.fixed_width_downsampled_url);
//
//                       rtm.send({
//                           text:      ":twss:",
//                           channel:   channel,
//                           thread_ts: ts,
//                           type:      RTM_EVENTS.MESSAGE
//                       });
//
//                   }
//
//              });
//
//          }
//     }
// });

// incoming http requests
slack.listen(process.env.PORT || '3000');
