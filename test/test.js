'use strict'

const expect = require('chai').expect
const delay = require('delay')
const _ = require('lodash')
const request = require('request')
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

describe('slack-app', function () {
  let slackMock
  const botToken = process.env.SLACK_API_TOKEN

  before(function () {
    // wait for bot to get bootstrapped
    this.timeout(30000)
    slackMock = require('../../index.js').instance

    slackMock.reset()
  //  require('../../../webexbot');
  })

  after(function () {
    return slackMock.rtm.stopServer(botToken)
  })

 it('should start an rtm connection after the oauth flow', function (done) {

slackMock.web.addResponse({
  //url: 'https://slack.com/api/oauth.access',
  url: '/api/oauth.access',
  statusCode: 200,
  body: {
    "access_token": "xoxp-XXXXXXXX-XXXXXXXX-XXXXX",
    "scope": "read",
    "team_name": "TestmybotTeam",
    "team_id": "T5203711518",
    "incoming_webhook": {
        "url": "http://slack.com/incomingWebhook",
        "channel": "#general",
        "configuration_url": "http://slack.com/incomingWebhook"
    },
    "bot": {
        "bot_user_id": "B1609650095",
        "bot_access_token": botToken
    }
    }
})

slackMock.web.addResponse({
  //url: 'https://slack.com/api/auth.test',
  url: '/api/auth.test',
  statusCode: 200,
  body: {
        ok: true,
        url: 'https://myteam.slack.com/',
        team: 'TestmybotTeam',
        user: 'testmybot',
        team_id: 'T5203711518',
        user_id: 'U2897724787'
  }
})

slackMock.web.addResponse({
  //url: 'https://slack.com/api/im.open',
  url: '/api/im.open',
  statusCode: 200,
  body: {
    "user": "U4792748182",
    "token": botToken
  }
})

slackMock.web.addResponse({
  url: '/api/rtm.start',
  statusCode: 200,
  body: {
    ok: true,
    self: {
      name: 'mockSelf',
      id: 'Bmock'
    },
    team: {
      name: 'mockTeam',
      id: 'Tmock'
    }
  }
})

    //"client_id": "159753246482.159685134291",
    //"client_secret": "b993ecebb034fe06bb05e2e31bc8f465",
request({
  method: 'POST',
  uri: 'http://localhost:9000/oauth',
  // uri: 'http//34.229.135.19:3000/oauth',
  qs: {
    "code": "C123123123"
  }
}, (err) => {
  console.log('+++++++++ sent oauth ++++++++++');
  if (err) {
    console.log('+++++++++ some error in oauth ++++++++++');
    return console.log(err)
  } else {
    console.log('+++++++++ No error in oauth ++++++++++');
  }

  return delay(500) // wait for oauth flow to complete, rtm to be established
    .then(() => {
      console.log('+++++++++ sending rtm ++++++++++');
      return slackMock.rtm.send(botToken, {type: 'message', channel: 'mockChannel', user: 'usr', text: 'hello'})
    })
    .then(delay(20))
    .then(() => {
      console.log('+++++++++ about to check expect ++++++++++');
      expect(slackMock.rtm.calls).to.have.length(1)
      expect(slackMock.rtm.calls[0].message.text).to.equal('GO CUBS')
    })
    .then(() => done(), (e) => done(e))
})
})

})

/*'use strict'

const expect = require('chai').expect
const delay = require('delay')

describe('single team bot', function () {
  let slackMock
  const token = process.env.SLACK_CLIENT_SECRET

  before(function () {
    slackMock = require('../index.js').instance

    return slackMock.rtm.send({token: 'abc123', type: 'message', channel: 'mockChannel', user: 'usr', text: 'hello'})
      .then(delay(50))
      .then(() => {
    expect(slackMock.rtm.calls).to.have.length(1)
    expect(slackMock.rtm.calls[0].message.text).to.equal('GO CUBS')
  })

    // required for bootstrap
    slackMock.addResponse({
      url: 'https://slack.com/api/rtm.start',
      status: 200,
      body: {
        ok: true,
        self: {
          name: 'mockSelf'
        },
        team: {
          name: 'mockTeam'
        }
      }
    })

    // this bot can only be bootstrapped once
//    require('../single-team-bot')

    // wait for RTM flow to complete
    return delay(50)
  })

  beforeEach(function () {
    slackMock.reset()
  })

  after(function () {
    // clean up server
    return slackMock.rtm.stopServer(token)
  })

  it('should respond to hello with GO CUBS', function () {
    return slackMock.rtm.send(token, {
      type: 'message',
      channel: 'mockChannel',
      user: 'usr',
      text: 'hello'
    })
      .then(delay(50))
      .then(() => {
        expect(slackMock.rtm.calls).to.have.length(1)
        expect(slackMock.rtm.calls[0].message.text).to.equal('GO CUBS')
      })
  })

  it('should respond to howdy with GO TRIBE', function () {
    return slackMock.rtm.send(token, {
      type: 'message',
      channel: 'mockChannel',
      user: 'usr',
      text: 'howdy'
    })
      .then(delay(50))
      .then(() => {
        expect(slackMock.rtm.calls).to.have.length(1)
        expect(slackMock.rtm.calls[0].message.text).to.equal('GO TRIBE')
      })
  })
})
*/
