var duplex = require('duplexify')
var ssejson = require('ssejson')
var pumpify = require('pumpify')
var debug = require('debug')('cat-lobby-alpha-api')

module.exports = function (state, utils) {
  
  return {
    create: createHandler,
    ping: pingHandler,
    pong: pongHandler,
    pings: pingsHandler,
    pongs: pongsHandler
  }
  
  function createHandler (req, res, opts, cb) {
    if (req.method !== 'POST') {
      var err = new Error('Only POST is allowed')
      err.statusCode = 405
      return cb(err)
    }
  
    var room = utils.makeName()
    res.setHeader('content-type', 'application/json')
    res.statusCode = 201
    res.end(JSON.stringify({name: room}))
    state.pings[room] = ssejson.serialize({})
    state.pongs[room] = ssejson.serialize({})
    
    var tId = setTimeout(function expire () {
      // TODO dont delete if being used
      destroy(room)
    }, 1000 * 60 * 30) // 30 mins
    state.timeouts.push(tId)
    
    debug('create', {name: room})
  }
  
  function pingHandler (req, res, opts, cb) {
    upload('pings', req, res, opts, function uploaded (err, room, buff) {
      if (err) {
        cb(err)
        return
      }
      debug('ping upload', {length: buff.length, name: room})
      state.pings[room].write(buff.toString())
      res.end()
    })
  }
  
  function pongHandler (req, res, opts, cb) {
    upload('pongs', req, res, opts, function uploaded (err, room, buff) {
      if (err) {
        cb(err)
        return
      }
      debug('pong upload', {length: buff.length, name: room})
      state.pongs[room].write(buff.toString())
      res.end()
    })
  }
  
  function pingsHandler (req, res, opts, cb) {
    var room = opts.params.name
    var events = state.pings[room]
    debug('pings subscribe', {name: room})
    subscribe(events, req, res, opts, cb)
  }
  
  function pongsHandler (req, res, opts, cb) {
    var room = opts.params.name
    var events = state.pongs[room]
    debug('pongs subscribe', {name: room})
    subscribe(events, req, res, opts, cb)
  }
  
  function upload (type, req, res, opts, cb) {
    if (req.method !== 'POST') {
      var err = new Error('Only POST is allowed')
      err.statusCode = 405
      return cb(err)
    }
    
    var room = opts.params.name
    
    if (!room || !state[type][room]) {
      var err = new Error('Doesnt exist or expired')
      err.statusCode = 404
      return cb(err)
    }

    var uploader = utils.uploadStream(function uploaded (buff) {      
      cb(null, room, buff)
    })

    pumpify(req, uploader).on('error', cb)
  }
  
  function subscribe (events, req, res, opts, cb) {
    if (!events) {
      var err = new Error('Doesnt exist or expired')
      err.statusCode = 404
      return cb(err)
    }
    res.setHeader('content-type', 'text/event-stream')
    var readable = duplex()
    readable.setReadable(events)
    pumpify(readable, res).on('error', cb)
  }

  function destroy (room) {
    if (state.pings[room]) {
      state.pings[room].on('finish', function () {
        delete state.pings[room]
      })
      state.pings[room].destroy()
    } else {
      delete state.pings[room]
    }
    
    if (state.pongs[room]) {
      state.pongs[room].on('finish', function () {
        delete state.pongs[room]
      })
      state.pongs[room].destroy()
    } else {
      delete state.pongs[room]
    }
  }
}