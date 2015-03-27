var test = require('tape')
var request = require('request')
var ssejson = require('ssejson')
var CatLobby = require('./')

test('ping and pong', function pingPong (t) {
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
