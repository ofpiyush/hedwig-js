'use strict';

const Hedwig = require("../api").Hedwig;

function msg_hander(channel, message) {
    console.log("Received", message.content.toString())
    channel.ack(message);
}


let hedwig = new Hedwig({
    HOST: process.env.RABBITMQ_HOST,
    USERNAME: process.env.RABBITMQ_USER,
    PASSWORD: process.env.RABBITMQ_PASS,
    VHOST: "events",
    CONSUMER: {
        RAISE_EXCEPTION: false,
        QUEUES: {
            "AUTO-1": {
                BINDINGS: ['yolo.*'],
                CALLBACK: msg_hander,
            }
        }
    }
});
hedwig.consume();