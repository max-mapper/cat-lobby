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
    upload('pings', req, res, opts, function uploaded (err, room, data) {
      if (err) {
        cb(err)
        return
      }
      debug('ping upload', {name: room})
      state.pings[room].write(data)
      res.end()
    })
  }

  function pongHandler (req, res, opts, cb) {
    upload('pongs', req, res, opts, function uploaded (err, room, data) {
      if (err) {
        cb(err)
        return
      }
      debug('pong upload', {name: room})
      state.pongs[room].write(data)
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
    if (!room || (Object.keys(state[type]).indexOf(room) === -1)) {
      var error = new Error('Doesnt exist or expired')
      error.statusCode = 404
      return cb(error)
    }

    var uploader = utils.uploadStream(function uploaded (buff) {
      try {
        var data = JSON.parse(buff)
        cb(null, room, data)
      } catch(e) {
        cb(e)
      }
    })

    pumpify(req, uploader).on('error', cb)
  }

  function subscribe (events, req, res, opts, cb) {
    if (!events) {
      var err = new Error('Doesnt exist or expired')
      err.statusCode = 404
      cb(err)
      return
    }
    res.setHeader('content-type', 'text/event-stream')
    var readable = duplex()
    readable.setReadable(events)
    pumpify(readable, res).on('error', cb)
  }

  function destroy (room) {
    finish(state.pings, room)
    finish(state.pongs, room)

    function finish (list, room) {
      if (Object.keys(list).indexOf(room) > -1) {
        list[room].on('finish', function () {
          delete list[room]
        })
        list[room].destroy()
      }
    }
  }
}
