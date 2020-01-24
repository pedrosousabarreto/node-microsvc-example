/**
 * Created by pedrosousabarreto@gmail.com on 17/Jan/2019.
 */


"use strict";

import * as kafka from 'kafka-node';
import * as async from 'async';
import {ConsoleLogger, ILogger} from "node-microsvc-lib";
import {KafkaClientOptions} from "kafka-node";
import {IEventStoreMessage} from "./kafka_messages";
import {TopicsNotExistError} from "kafka-node";

export class KafkaProducer {
	private _client!: kafka.KafkaClient;
	private _env_name: string;
	private _kafka_conn_str: string;
	private _kafka_client_name: string;
	private _producer!: kafka.HighLevelProducer;
	private _known_topics = new Map<string, boolean>();
	protected _logger: ILogger;

	constructor(kafka_con_string: string, kafka_client_name: string, env_name: string, logger?: ILogger) {
		this._kafka_conn_str = kafka_con_string;
		this._kafka_client_name = kafka_client_name;

		this._env_name = env_name || process.env["NODE_ENV"] || "dev";

		if(logger && typeof (<any>logger).child === "function"){
			this._logger = (<any>logger).child({ class: "KafkaProducer" });
		}else{
			this._logger = new ConsoleLogger();
		}

		this._logger.info("instance created");
	}

	init(callback:(err?:Error)=>void) {
		let self = this;
		this._logger.info("initialising...");

		let kafka_client_options:KafkaClientOptions = {
			kafkaHost: this._kafka_conn_str,
			clientId: this._kafka_client_name,
		};

		this._client = new kafka.KafkaClient(kafka_client_options);
		this._producer = new kafka.HighLevelProducer(this._client, {partitionerType: 3});


		this._producer.on("ready", () => {
			this._logger.info("KafkaProducer ready!");

			// force refresh metadata to avoid BrokerNotAvailableError on first request
			// https://www.npmjs.com/package/kafka-node#highlevelproducer-with-keyedpartitioner-errors-on-first-send

			this._client.refreshMetadata([], (err:Error) => {
				if (err) {
					this._logger.error(err, " - error refreshMetadata()");
					return callback.call(self, err);
				}

				// console.log("metadata refreshed", this._get_log_prefix());
				callback.call(self);
			});
		});


		this._producer.on("error", (err:Error)=>{
			this._logger.error(err, "KafkaProducer on error");
		});


		// this._client.connect();
	}

	destroy(callback?:(err?:Error)=>{}){
		if(this._producer && this._producer.close)
			this._producer.close(callback ? callback : ()=>{});
		else {
			if (callback)
				return callback();
		}
	}

	get env_name():string{
		return this._env_name;
	}



	private _refresh_metadata(topic_name:string, callback:(err?:Error)=>void){
		this._client.refreshMetadata([topic_name], (err?:Error) => {
			if (err) {
				this._logger.error(err," - error refreshMetadata()");
				return callback(err);
			}

			this._client.topicExists([topic_name], (error?: TopicsNotExistError | any)=>{
				if(error)
					return callback(error);

				return callback();
			});
		});
	}

	send(kafka_msg: IEventStoreMessage, callback:(err?:Error, offset_data?:any)=>void):void;
	send(kafka_messages: IEventStoreMessage[], callback:(err?:Error, offset_data?:any)=>void):void;
	send(kafka_messages: any, callback:(err?:Error, offset_data?:any)=>void):void {
		if(!Array.isArray(arguments[0]))
			kafka_messages = <IEventStoreMessage[]>[arguments[0]];

		let msgs_by_topic: Map<string, kafka.KeyedMessage[]> = new Map<string, kafka.KeyedMessage[]>();
		let payloads: any[] =[];

		// iterate the messages parse it and to check and fill _known_topics with first time topics
		kafka_messages.forEach((kafka_msg: IEventStoreMessage)=>{
			if(!kafka_msg.header.msg_topic)
				throw new Error("Invalid topic for message: "+kafka_msg.header.msg_schema_name);

			let msg:string;
			let topic = this._env_name + "_"+ kafka_msg.header.msg_topic; // prefix env_name on all topics
			let key = kafka_msg.header.msg_key;


			try {
				msg = JSON.stringify(kafka_msg);
			} catch (e) {
				this._logger.error(e, +" - error parsing message");
				return process.nextTick(() => {
					callback(new Error("KafkaProducer - Error parsing message"));
				});
			}

			if (!msg) {
				this._logger.error("invalid message in send_message");
				return process.nextTick(() => {
					callback()
				});
			}

			// check for known topic and add null if not there
			if(!this._known_topics.has(topic))
				this._known_topics.set(topic, false);

			let km = new kafka.KeyedMessage(key, msg);
			payloads.push({topic: topic, messages: km, key: key});
			// payloads.push({topic: topic, messages: [km]});
			// payloads.push(km);
		});

		// make sure we refresh metadata for first time topics - otherwise we bet BrokerNotAvailable error on first time topic
		async.each(Array.from(this._known_topics.entries()), (item, next)=>{
			let topic_name = item[0];
			let val = item[1];
			if(val)
				return next();

			// first time topic - refresh metadata to avoid BrokerNotAvailableError
			this._refresh_metadata(topic_name, (err?:Error, data?:any)=>{
				if(err)
					return next(err);

				this._known_topics.set(topic_name, true);
				next();
			});
		}, (err?:Error | null)=>{
			if(err)
				return callback(err);

			// all good, send the messages
			this._producer.send(payloads, (err?:Error|null, data?:any) => {
				if (err) {
					this._logger.error(err, " - error sending message");
					return callback(err);
				}

				console.log("sent message - response: %j", data);
				callback(undefined, data);
			});

		});


	}
}
