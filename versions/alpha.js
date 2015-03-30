var duplex = require('duplexify')
var ssejson = require('ssejson')
var pumpify = require('pumpify')
var debug = require('debug')('cat-lobby-alpha-api')

module.exports = function (state, utils) {
  
  return {
    upload: uploadHandler,
    pong: pongHandler,
    ping: pingHandler,
    pongs: pongsHandler
  }
  
  function uploadHandler (req, res, opts, cb) {
    if (req.method !== 'POST') {
      var err = new Error('Only POST is allowed')
      err.statusCode = 405
      return cb(err)
    }

    var uploader = utils.uploadStream(function uploaded (buff) {
      var ping = utils.makeName()
      debug('ping upload', {length: buff.length, name: ping})
      state.pings[ping] = buff
      state.pongs[ping] = ssejson.serialize({})
      var tId = setTimeout(function expire () {
        delete state.pings[ping]
        delete state.pongs[ping]
      }, 1000 * 60 * 30) // 30 mins
      state.timeouts.push(tId)
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({name: ping}))
    })

    pumpify(req, uploader).on('error', cb)
  }
  
  function pongHandler (req, res, opts, cb) {
    if (req.method !== 'POST') {
      var err = new Error('Only POST is allowed')
      err.statusCode = 405
      return cb(err)
    }

    var pong = opts.params.name

    if (!state.pongs[pong]) {
      var err = new Error('Doesnt exist or expired')
      err.statusCode = 404
      return cb(err)
    }

    var uploader = utils.uploadStream(function uploaded (buff) {
      debug('pong upload', {length: buff.length, name: pong})
      state.pongs[pong].write(buff.toString())
      state.pongs[pong].end()
      res.setHeader('content-type', 'application/json')
      res.end()
    })

    pumpify(req, uploader).on('error', cb)
  }
  
  function pingHandler (req, res, opts, cb) {
    var ping = state.pings[opts.params.name]
    if (!ping) {
      var err = new Error('Doesnt exist or expired')
      err.statusCode = 404
      return cb(err)
    }
    debug('ping get', {name: opts.params.name})
    res.end(ping)
    cb()
  }
  
  function pongsHandler (req, res, opts, cb) {
    var pong = state.pongs[opts.params.name]
    if (!pong) {
      var err = new Error('Doesnt exist or expired')
      err.statusCode = 404
      return cb(err)
    }
    res.setHeader('content-type', 'text/event-stream')
    var readable = duplex()
    readable.setReadable(pong)
    pumpify(readable, res).on('error', cb)
    debug('pong subscribe', {name: opts.params.name})
  }
}
