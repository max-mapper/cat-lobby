var http = require('http')

var HttpHashRouter = require('http-hash-router')
var catNames = require('cat-names')
var concat = require('concat-stream')
var pumpify = require('pumpify')
var corsify = require('corsify')
var debug = require('debug')('cat-lobby')

var limitStream = require('./limit-stream.js')

module.exports = function create (lobbyOpts) {
  if (!lobbyOpts) lobbyOpts = {}

  var router = HttpHashRouter()

  var state = {
    pings: {},
    pongs: {},
    timeouts: []
  }

  var utils = {
    makeName: makeName,
    rnd: rnd,
    uploadStream: uploadStream
  }
  
  var alphaAPI = require('./versions/alpha.js')(state, utils)

  router.set('/ping', alphaAPI.upload)
  router.set('/pong/:name', alphaAPI.pong)
  router.set('/ping/:name', alphaAPI.ping)
  router.set('/pongs/:name', alphaAPI.pongs)
  
  var v1API = require('./versions/v1.js')(state, utils)

  router.set('/v1/create', v1API.create)
  router.set('/v1/ping/:name', v1API.ping)
  router.set('/v1/pong/:name', v1API.pong)
  router.set('/v1/pings/:name', v1API.pings)
  router.set('/v1/pongs/:name', v1API.pongs)

  return createServer(router)

  function uploadStream (cb) {
    var limiter = limitStream(1024 * 5) // 5kb max

    var concatter = concat(function concatted (buff) {
      cb(buff)
    })

    return pumpify(limiter, concatter)
  }

  function makeName () {
    var n = [utils.rnd(), utils.rnd(), utils.rnd()].join('-')
    if (state.pings[n]) return utils.makeName()
    return n
  }

  function rnd () {
    return catNames.random().toLowerCase().replace(/\s/g, '-')
  }

  function createServer (router) {
    var cors = corsify({
      "Access-Control-Allow-Methods": "POST, GET"
    })

    var server = http.createServer(corsify(handler))

    function handler (req, res) {
      debug(req.url, 'request/response start')
      
      req.on('end', function logReqEnd () {
        debug(req.url, 'request end')
      })
      
      res.on('end', function logResEnd () {
        debug(req.url, 'response end')
      })
      
      router(req, res, {}, onError)

      function onError (err) {
        if (err) {
          debug('error', {path: req.url, message: err.message})
          res.statusCode = err.statusCode || 500
          res.end(err.message)
        }
      }
    }

    server.on('close', function closed () {
      // to prevent process from hanging open
      state.timeouts.forEach(function each (t) {
        clearTimeout(t)
      })
    })

    return server
  }
}
