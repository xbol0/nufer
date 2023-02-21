# nufer

Nostr Upstream Filter

A simple Nostr relay proxy for filter out spam notes.

## Features

- Written in Deno, can be deployed on [Deno Deploy](https://deno.com/deploy)
- No database need
- Custom relay forward

## Usage

Configure your environments:

```sh
# listen port, defaults 9000
PORT=

# keywords split by space
KEYWORDS='some spam key words'

# default relay hostname, defaults relay.damus.io
UPSTREAM=
```

Then start your service:

```sh
deno task start
```

Add your service to your relay list.

```sh
# use default relay
wss://your-host

# custom relay
wss://your-host/other-relay
wss://your-host/nos.lol
```