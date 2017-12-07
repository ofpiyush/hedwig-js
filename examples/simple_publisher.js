'use strict';

const Hedwig = require("../api").Hedwig;


let hedwig = new Hedwig({
    HOST: process.env.RABBITMQ_HOST,
    USERNAME: process.env.RABBITMQ_USER,
    PASSWORD: process.env.RABBITMQ_PASS,
    VHOST: "events",
    CONSUMER: {
        RAISE_EXCEPTION: false,
        QUEUES: {}
    }
});

let i = 0;
setInterval(() => {
    console.log("Publishing", i);
    hedwig.publish("yolo." + i, new Buffer("hahahaha " + i));
    i++;
}, 3 * 1000);

