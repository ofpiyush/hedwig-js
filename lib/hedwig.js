'use strict';

const DEFAULT_QUEUE_SETTINGS = require("./settings").DEFAULT_QUEUE_SETTINGS;
const DEFAULT_SETTINGS = require("./settings").DEFAULT_SETTINGS;

const amqp = require('amqplib/callback_api');

class Hedwig {
    constructor(settings, err_callback, close_callback) {
        this._should_consume = false;
        this._pubQueue = [];
        this._connecting = false;
        this._closing = false;
        this._connection_attempts = 0;

        let merged_settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        Object.assign(merged_settings, settings);
        this._settings = merged_settings;
        this._conn_params = {
            protocol: 'amqp',
            hostname: this._settings.HOST,
            port: this._settings.PORT,
            username: this._settings.USERNAME,
            password: this._settings.PASSWORD,
            heartbeat: this._settings.HEARTBEAT_INTERVAL,
            vhost: this._settings.VHOST,
        };

        this._cleanup();
        if (!err_callback) {
            err_callback = (err) => {
                console.error({"package": "hedwig", "error": err.message});
                if ((this._connection === null || this._channel === null) && !this._connecting) {
                    this._backoff_reconnect();
                }
            };
        }
        if (!close_callback) {
            close_callback = () => {
                console.info({"package": "hedwig", "message": "connection closed"});
                this._backoff_reconnect()
            }
        }
        this._err_callback = err_callback;
        this._close_callback = () => {
            this._cleanup();
            close_callback();
        };
    }

    consume() {
        if (this._connection === null || this._channel == null) {
            this._should_consume = true;
            return this.reconnect();
        }
        if (Object.keys(this._settings.CONSUMER.QUEUES).length === 0) {
            return;
        }
        Object.keys(this._settings.CONSUMER.QUEUES).forEach((q_name) => {
            let q_settings = JSON.parse(JSON.stringify(DEFAULT_QUEUE_SETTINGS));
            Object.assign(q_settings, this._settings.CONSUMER.QUEUES[q_name]);
            let queue_name = q_name;
            if (queue_name.startsWith("AUTO-")) {
                // Unnamed queues will not be persisted
                queue_name = "";
                q_settings.AUTO_DELETE = true;
            }
            let q_options = {
                durable: q_settings.DURABLE,
                autoDelete: q_settings.AUTO_DELETE,
                exclusive: q_settings.EXCLUSIVE
            };
            if (!this._channel) {
                return
            }
            this._channel.assertQueue(
                queue_name,
                q_options, (err, q) => {
                    for (let i in q_settings.BINDINGS) {
                        if (!this._channel) {
                            return
                        }
                        this._channel.bindQueue(q.queue, this._settings.EXCHANGE, q_settings.BINDINGS[i]);
                    }
                    this._channel.consume(q.queue, (msg) => {
                        try {
                            q_settings.CALLBACK(this._channel, msg);
                        } catch (e) {
                            if (this._settings.CONSUMER.RAISE_EXCEPTION) {
                                throw e;
                            }
                            this._err_callback(e);
                        }

                    }, {noAck: q_settings.NO_ACK});

                });
        })
    }

    publish(routing_key, message, options) {
        if (!message instanceof Buffer) {
            if (this._settings.EMITTER.RAISE_EXCEPTION) {
                throw new Error("Payload must be of type buffer");
            }
            return
        }
        try {
            return this._channel.publish(this._settings.EXCHANGE, routing_key, message, options)
        } catch (e) {
            this._pubQueue.push({
                "key": routing_key,
                "message": message,
                "options": options
            })
            // As people are trying to send messages, let us reconnect
            this.reconnect();
            return true;
        }
    }

    reconnect() {
        if (!this._connecting) {
            this._connecting = true;
            this._closing = false;
            this._cleanup();
            if (this._connection_attempts < 8) {
                this._connection_attempts++;
            }
            amqp.connect(this._conn_params, {timeout: this._settings.SOCKET_TIMEOUT * 1000}, this._on_connected.bind(this));
        }
    }

    disconnect() {
        this._closing = true;
        this._cleanup();
    }

    add_queue(q_setting,q_name) {
        if (this._channel) {
            throw new Error("Should not add queues while channel is active. Disconnect first");
        }
        if (!q_name) {
            q_name = "AUTO-"+Object.keys(this._settings.CONSUMER.QUEUES).length+"-"+(q_setting.BINDINGS.join("."));
            q_setting.AUTO_DELETE = true;
        }
        this._settings.CONSUMER.QUEUES[q_name] = q_setting;
    }

    _backoff_reconnect() {
        if (!this._closing) {
            // Exponential backoff
            let delay = (Math.pow(2, this._connection_attempts) - 1) * 1000;
            setTimeout(this.reconnect.bind(this), delay);
        }
    }

    _on_connected(err, connection) {
        this._connecting = false;
        if (err) {
            this._err_callback(err);
            return
        }
        this._connection_attempts = 0;
        console.info({"package":"hedwig","message":"connected"})
        connection.on("error", this._err_callback);
        connection.on("close", this._close_callback);
        this._connection = connection;

        this._connection.createChannel((err, ch) => {

            if (err !== null) {
                this._err_callback(err);
                return;
            }

            ch.on("error", this._err_callback);
            ch.on("close", this._close_callback);

            this._channel = ch;
            this._start_publishing();

            if (!this._should_consume) {
                return;
            }
            this.consume();
        });
    }

    _start_publishing() {
        if (!this._channel) {
            return
        }
        this._channel.assertExchange(this._settings.EXCHANGE, this._settings.EXCHANGE_TYPE, {
            durable: true,
            autoDelete: false
        }, (err, ok) => {
            if (err !== null) {
                this._err_callback(err);
                return;
            }
            let send_msgs = () => {
                let my_q = this._pubQueue;
                this._pubQueue = [];
                while (true) {
                    let msg = my_q.shift();
                    if (!msg) break;
                    this.publish(msg.key, msg.message, msg.options);
                }
                if (this._pubQueue.length !== 0) {
                    setTimeout(send_msgs.bind(this), 1000);
                }
            };
            send_msgs();

        });
    }

    _cleanup() {
        try {
            this._connection.close();
        } catch (e) {
            // Ignore the exception. we tried to close.
        }
        this._connection = null;
        this._channel = null;
    }

}

module.exports.Hedwig = Hedwig;