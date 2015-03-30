var test = require('tape')
var request = require('request')
var ssejson = require('ssejson')
var CatLobby = require('./')

test('ping and pong v1 API', function pingPong (t) {
  var lobby = CatLobby()

  lobby.listen(5005, function listening (err) {
    if (err) return t.err(err)

    var ping = 'hello world'
    var pong = 'hi welt'

    request.post({uri: 'http://localhost:5005/v1', json: true}, function response (err, resp, data) {
      if (err) return t.err(err)
      t.equals(resp.statusCode, 201, 'got 201 created')
      t.ok(data.name, 'has name ' + data.name)
      var n = data.name

      var pending = 2
      var pingReq = request('http://localhost:5005/v1/' + n + '/pongs')
      pingReq
        .pipe(ssejson.parse())
        .on('data', function data (row) {
          if (!row.data) return
          t.equal(row.data, pong, 'pong matches')
          if (--pending === 0) finish()
        })

      var pongReq = request('http://localhost:5005/v1/' + n + '/pings')
      pongReq
        .pipe(ssejson.parse())
        .on('data', function data (row) {
          if (!row.data) return
          t.equal(row.data, ping, 'ping matches')
          if (--pending === 0) finish()
        })

      function finish () {
        pingReq.abort()
        pongReq.abort()
        lobby.close(function closed (err) {
          if (err) t.ifErr(err)
          t.end()
        })
      }

      var urls = {
        ping: 'http://localhost:5005/v1/' + n + '/ping',
        pong: 'http://localhost:5005/v1/' + n + '/pong'
      }

      request.post({uri: urls.ping, json: {data: ping}}, function response (err, resp, buff) {
        if (err) return t.err(err)
        t.equals(resp.statusCode, 200, 'got 200 OK')
        t.notOk(buff, 'no resp body')

        request.post({uri: urls.pong, json: {data: pong}}, function response (err, resp, buff) {
          if (err) return t.err(err)
          t.equals(resp.statusCode, 200, 'got 200 OK')
          t.notOk(buff, 'no resp body')
        })
      })
    })
  })
})
