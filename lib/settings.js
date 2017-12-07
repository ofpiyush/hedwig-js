'use strict';

const DEFAULT_SETTINGS = {
    'EXCHANGE': 'hedwig',
    'EXCHANGE_TYPE': 'topic',
    'HEARTBEAT_INTERVAL': 5,
    'SOCKET_TIMEOUT': 1,
    'HOST': 'localhost',
    'PORT': 5672,
    'VHOST': '',
    'USERNAME': '',
    'PASSWORD': '',
    'EMITTER': {
        'RAISE_EXCEPTION': false,
    },
    'CONSUMER': {
        'RAISE_EXCEPTION': false,
        'QUEUES': {}
    }
};

const DEFAULT_QUEUE_SETTINGS = {
    "BINDINGS": [],
    "DURABLE": true,
    "AUTO_DELETE": false,
    "EXCLUSIVE": false,
    "NO_ACK": false,
    "CALLBACK": () => {
    },
};

module.exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
module.exports.DEFAULT_QUEUE_SETTINGS = DEFAULT_QUEUE_SETTINGS;