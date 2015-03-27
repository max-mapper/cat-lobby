#!/usr/bin/env node

var lobby = require('./')()
var port = process.argv[2] || process.env.PORT || 5005

lobby.listen(port, function listening (err) {
  if (err) throw err
  console.log('Listening on', port)
})
