# cat-lobby

simple http+sse based lobby server with cat themed room names

[![RUN Cat-Lobby ON OpenShift](http://launch-shifter.rhcloud.com/launch/RUN Cat-Lobby ON.svg)](https://openshift.redhat.com/app/console/application_type/custom?&cartridges[]=nodejs-0.10&initial_git_url=https://github.com/maxogden/cat-lobby.git&name=cat-lobby)

### install + run

```
npm install cat-lobby -g
cat-lobby
```

### HTTP API

#### POST `/`

creates a new lobby. receives response `{name: new lobby name}`

#### POST `/ping/:name`
#### POST `/pong/:name`

POST JSON to either the ping or pong channel. upload must be JSON and will be streamed out to anyone listening to pings/pongs. no response body

#### GET `/pings/:name`
#### GET `/pongs/:name`

listen to pings or pongs using Server-Sent Events
