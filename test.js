var test = require('tape')
var request = require('request')
var ssejson = require('ssejson')
var CatLobby = require('./')

test('ping and pong alpha API', function pingPong (t) {
  var lobby = CatLobby()

  lobby.listen(5005, function listening (err) {
    if (err) return t.err(err)

    var ping = new Buffer('hello world')
    var pong = new Buffer('hi welt')

    request.post({uri: 'http://localhost:5005/ping', body: ping}, function response (err, resp, buff) {
      if (err) return t.err(err)
      t.equals(resp.statusCode, 200, 'got 200 OK')
      var body = JSON.parse(buff)
      t.ok(body.name, 'has name ' + body.name)
      var n = body.name

      request('http://localhost:5005/ping/' + n, function response (err, resp, buff) {
        if (err) return t.err(err)
        t.equals(resp.statusCode, 200, 'got 200 OK')
        t.equals(buff.toString(), ping.toString(), 'ping matches')

        request.post({uri: 'http://localhost:5005/pong/' + n, body: pong}, function response (err, resp, buff) {
          if (err) return t.err(err)
          t.equals(resp.statusCode, 200, 'got 200 OK')
          t.equals(buff.length, 0, 'no resp body')

          var req = request('http://localhost:5005/pongs/' + n)
            .pipe(ssejson.parse())
            .on('data', function data (row) {
              t.equal(row, pong.toString(), 'pong matches')
              req.end()
              lobby.close(function closed (err) {
                t.end()
              })
            })
        })
      })
    })
  })

})

test('ping and pong v1 API', function pingPong (t) {
  var lobby = CatLobby()

  lobby.listen(5005, function listening (err) {
    if (err) return t.err(err)

    var ping = 'hello world'
    var pong = 'hi welt'

    request.post({uri: 'http://localhost:5005/v1/create', json: true}, function response (err, resp, data) {
      if (err) return t.err(err)
      t.equals(resp.statusCode, 201, 'got 201 created')
      t.ok(data.name, 'has name ' + data.name)
      var n = data.name

      var pending = 2
      var pingReq = request('http://localhost:5005/v1/pongs/' + n)
      pingReq
        .pipe(ssejson.parse())
        .on('data', function data (row) {
          row = JSON.parse(row)
          if (!row.data) return
          t.equal(row.data, pong, 'pong matches')
          if (--pending === 0) finish()
        })

      var pongReq = request('http://localhost:5005/v1/pings/' + n)
      pongReq
        .pipe(ssejson.parse())
        .on('data', function data (row) {
          row = JSON.parse(row)
          if (!row.data) return
          t.equal(row.data, ping, 'ping matches')
          if (--pending === 0) finish()
        })

      function finish () {
        pingReq.abort()
        pongReq.abort()
        lobby.close(function closed (err) {
          t.end()
        })
      }

      request.post({uri: 'http://localhost:5005/v1/ping/' + n, json: {data: ping}}, function response (err, resp, buff) {
        if (err) return t.err(err)
        t.equals(resp.statusCode, 200, 'got 200 OK')
        t.notOk(buff, 'no resp body')

        request.post({uri: 'http://localhost:5005/v1/pong/' + n, json: {data: pong}}, function response (err, resp, buff) {
          if (err) return t.err(err)
          t.equals(resp.statusCode, 200, 'got 200 OK')
          t.notOk(buff, 'no resp body')
        })
      })
    })
  })
})
