# Note:

Since the release of [cloudevents](https://cloudevents.io), there is no need for hedwig anymore. Please use the [Typescript SDK](https://github.com/cloudevents/sdk-typescript) or the [Javascript SDK](https://github.com/cloudevents/sdk-javascript)

# Hedwig
JS client similar to [hedwig-py](https://github.com/ofpiyush/hedwig-py)

Hedwig makes connecting to any AMQP 0.9.1 server simple.

It wraps `amqplib` and exposes few simple functions over it. 

It handles reconnection, exponential backoff, publish queueing etc internally.

## Installation

`npm install --save hedwig-js`

## API

Like it's python cousin, Hedwig exposes 1 method to `publish` and one to `consume`.

```js
const hedwig = new Hedwig(configuration, err_callback, close_callback)
// Ask hedwig to start consuming from RabbitMQ
hedwig.consume();

let buffer_payload = new Buffer("hello world");
// Publish a message to 
hedwig.publish("my.routing.key.here", buffer_payload);
```
Thats it!

## Examples

Do check the [examples](https://github.com/ofpiyush/hedwig-js/tree/master/examples) directory for examples on how to use hedwig.
