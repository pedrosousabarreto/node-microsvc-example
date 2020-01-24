/**
 * Created by pedrosousabarreto@gmail.com on 17/Jan/2019.
 */
"use strict";

import {EventEmitter} from "events";
import * as _ from "underscore";
import * as kafka from 'kafka-node';
import * as async from 'async';
import {ConsoleLogger, ILogger} from "node-microsvc-lib";

const MAX_PROCESSING_TIMEOUT = 30*1000;


export class KafkaConsumer extends EventEmitter {
	// private _client: kafka.Client;
	private _topics: string[];
	private _consumer_group!: kafka.ConsumerGroup;
	private _consumer_group_name: string;
	private _kafka_conn_str: string;
	private _kafka_client_name: string;
	private _initialized: boolean = false;
	private _env_name: string;

	private _queue: any[] = [];
	private _processing:boolean = false;
	private _handler_fn!: (msg:any, callback:()=>void)=>void;
	private _from_offset: "latest" | "earliest";

	protected _logger: ILogger;

	constructor(kafka_con_string: string, kafka_client_name: string, kafka_consumer_group: string,
				topics: string | string[], env_name: string,
				from_offlet: "latest" | "earliest" = "latest",
				logger?: ILogger
	) {
		super();

		this._kafka_conn_str = kafka_con_string;
		this._kafka_client_name = kafka_client_name;
		this._consumer_group_name = kafka_consumer_group;

		this._env_name = env_name || process.env["NODE_ENV"] || "dev";

		if (typeof topics === "string")
			topics = [topics];

		this._topics = topics.map((topic_name) => {
			return this._env_name + "_" + topic_name;
		});


		this._from_offset = from_offlet;

		if(logger && typeof (<any>logger).child === "function"){
			this._logger = (<any>logger).child({
				class: "KafkaConsumer",
				kafka_topics: this._topics.join(","),
				kafka_groupname: this._consumer_group_name
			});
		}else{
			this._logger = new ConsoleLogger();
		}


		this._logger.debug(`starting kafka consumer with kafka_conn_string: ${kafka_con_string} and kafka_events_topic: ${this._topics.join(',')}`);

		this._logger.info("instance created");
	}

	destroy(force_commit: boolean = false, callback?:(err?:Error)=>void) {
		if (this._consumer_group && this._consumer_group.close)
			this._consumer_group.close(force_commit, (callback ? callback : () => {
			}));
		else {
			if (callback)
				return callback();
		}
	}

	remove_handler(){
		this._handler_fn = ()=>{}; // noop
	}

	set_handler(handler_fn:(msg:any, callback:()=>void)=>void){
		this._handler_fn = handler_fn;
		this._process_queue();
	}

	init(callback: (err?: Error) => void) {

		this._logger.info("initialising...");

		let consumer_group_options = {
			kafkaHost: this._kafka_conn_str,
			// host: this._kafka_conn_str,
			id: this._kafka_client_name,
			groupId: this._consumer_group_name,
			sessionTimeout: 15000,
			// An array of partition assignment protocols ordered by preference.
			// 'roundrobin' or 'range' string for built ins (see below to pass in custom assignment protocol)
			protocol: ['roundrobin'],
			autoCommit: true, //this._auto_commit,
			// Offsets to use for new groups other options could be 'earliest' or 'none' (none will emit an error if no offsets were saved)
			// equivalent to Java client's auto.offset.reset
			fromOffset: this._from_offset,  //"latest", // default is latest
			// outOfRangeOffset: 'earliest', // default is earliest
			// migrateHLC: false,    // for details please see Migration section below
			// migrateRolling: true,
			// migrateHLC: true, // default is false
			// migrateRolling: false, // default is true
			connectOnReady: true, //this._connect_on_ready,
			// paused: true
		};

		this._consumer_group = new kafka.ConsumerGroup(
			consumer_group_options as kafka.ConsumerGroupOptions, this._topics
		);

		this._consumer_group.on('error', (err:Error) => {
			this._logger.error(err, " - consumer error");
			process.nextTick(() => {
				this.emit("error", err);
			});
		});

		this._consumer_group.on('offsetOutOfRange', (err) => {
			this._logger.error(err, " - offsetOutOfRange consumer error");
			process.nextTick(() => {
				this.emit("error", err);
			});
		});

		// hook on message
		this._consumer_group.on('message', this.message_handler.bind(this));


		(this._consumer_group as any).on("connect", ()=>{
			if (!this._initialized && callback) {
				this._logger.info("first on connect");

				this._initialized = true;
				process.nextTick(() => {
					return callback();
				});
			}else{
				this._logger.info("on connect - (re)connected");
			}
		});

		this._consumer_group.client.on('ready', () => {

			this._logger.info("on ready");
		});

		this._consumer_group.client.on('reconnect', () => {
			this._logger.info("on reconnect");
		});

		// TODO need a timeout for this on-ready
	}

	connect() {
		(<any>this._consumer_group).connect();
	}

	pause() {
		this._consumer_group.pause();
	}

	resume() {
		this._consumer_group.resume();
	}

	// get_latest_offsets() {
	// 	return this._startup_latest_offsets;
	// }

	message_handler(message:any) {
		console.log(`message received - topic: ${message.topic} offset: ${message.offset} partition: ${message.partition}`);
		// let msg = _.clone(message);

		try {
			// get key string from buffer
			// message.key = message.key.toString();

			if (!_.isObject(message.value)) {
				try {
					message.value = JSON.parse(message.value);
				} catch (e) {
					this._logger.error(e," - error on message_handler");
					return;
				}
			}

			if (!message.value)
				return;

			this._queue.push(message);
			this._process_queue.call(this);
		} catch (e) {
			this._logger.error(e, "error sending message to handler - message was not commited to kafka");
		}
	}

	close() {
		this._consumer_group.close(false, () => {
		});
	}


	_process_queue(){
		if (this._processing || this._queue.length <= 0 || !this._handler_fn)
			return;

		this._processing = true;


		async.whilst(()=>{return this._queue.length>0;}, (next)=>{
			let wrapped = async.timeout(this._handler_fn, MAX_PROCESSING_TIMEOUT);

			wrapped(this._queue.shift(), (err:any)=>{
				if(err && err.code === "ETIMEDOUT")
					this._logger.warn(`KafkaConsumer2 - handler timedout after ${MAX_PROCESSING_TIMEOUT} ms`);
				else if (err)
					this._logger.error(err);

				next();
			});
		}, ()=>{
			this._processing = false;
			if(this._queue.length>0)
				setTimeout(()=>{this._process_queue();}, 0);
		});
	}
}