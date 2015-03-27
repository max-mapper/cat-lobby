# cat-lobby

simple http+sse based lobby server with cat themed room names

### install + run

```
npm install cat-lobby -g
cat-lobby
```

### HTTP API

#### POST `/ping`

POST upload string body, receive `{name: 'new cat themed name'}` as response. upload body will get stored on server while session is around

#### GET `/ping/:name`

get the stored upload payload from the server for a known session name. returns raw string payload

#### POST `/pong/:name`

POST upload string body pong response to a session. upload will be streamed out to anyone listening to pongs. no response body

#### GET `/pongs/:name`

listen to pongs using Server-Sent Events. Usually only one pong will get emitted
