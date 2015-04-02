/* global EventSource */
var server = 'http://catlobby.maxogden.com'

var nets = require('nets')
var url = require('url')

var params = url.parse(window.location.href, true).query
if (params.room) {
  var room = params.room
  // listen for pongs
  var events = new EventSource(server + '/v1/' + room + '/pongs')
  events.onmessage = function onMessage (e) {
    var row
    try {
      row = JSON.parse(e.data)
    } catch (e) {
      row = {}
    }
    console.log('pongs onmessage', row)
  }

  setInterval(function () {
    nets({method: 'POST', url: server + '/v1/' + room + '/ping', json: {time: new Date()}}, function (err, resp, body) {
      if (err) console.error(err)
      console.log('SENT PING', body)
    })
  }, 5000)

} else {
  nets({method: 'POST', url: server + '/v1', json: true}, function (err, resp, body) {
    if (err) console.error(err)
    var room = body.name
    console.log('ROOM', room)

    // listen for pings
    var events = new EventSource(server + '/v1/' + room + '/pings')
    events.onmessage = function onMessage (e) {
      var row
      try {
        row = JSON.parse(e.data)
      } catch (e) {
        row = {}
      }
      console.log('pings onmessage', row)
    }

    setInterval(function () {
      nets({method: 'POST', url: server + '/v1/' + room + '/pong', json: {time: new Date()}}, function (err, resp, body) {
        if (err) console.error(err)
        console.log('SENT PONG', body)
      })
    }, 5000)
  })
}
