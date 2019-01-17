/**
 * Created by pedro.barreto@bynder.com on 17/Jan/2019.
 */
"use strict";

import * as kafka from "kafka-node";
import * as assert from "assert";
import * as async from "async";
import * as _ from "underscore";

import {IDiFactory, ILogger, ServiceConfigs} from "node-microsvc-lib";
import {KafkaConsumer} from "../../infra_libs/kafka_consumer";

export class TestEventHandler implements IDiFactory {
	private _name = "TestEventHandler";
	private _configs: ServiceConfigs;

	private _kafka_consumer!: KafkaConsumer;
	private _logger: ILogger;


	get name() {
		return this._name;
	};

	constructor(configs: ServiceConfigs, logger:ILogger) {
		this._configs = configs;
		this._logger = logger.create_child({component: this.name});

		assert.ok(configs.get_param_value("kafka_conn_string"));
		assert.ok(configs.get_param_value("kafka_events_topic"));
	}

	init(callback: (err?: Error) => void) {
		let kafka_conn_string = this._configs.get_param_value("kafka_conn_string");
		let kafka_events_topic = this._configs.get_param_value("kafka_events_topic");

		this._logger.debug(`starting kafka consumer with kafka_conn_string: ${kafka_conn_string} and kafka_events_topic: ${kafka_events_topic}`);

		this._kafka_consumer = new KafkaConsumer(
			kafka_conn_string,
			this._configs.instance_id,
			this._configs.app_full_name+"_"+this.name,
			kafka_events_topic,
			this._configs.env,
			"latest",
			this._logger
		);
		this._kafka_consumer.on("error", this._handle_consumer_error.bind(this));
		this._kafka_consumer.set_handler(this._handle_event.bind(this));


		// @ts-ignore
		async.parallel([
			this._kafka_consumer.init.bind(this._kafka_consumer),
		], (err?: Error) => {
			if (err)
				this._logger.error(err, "error initializing");
			else
				this._logger.info("initialized");
			callback(err);
		});
	}

	destroy(callback:()=>void){
		this._logger.info("%s - destroying...", this.name);
		async.parallel([
			// @ts-ignore
			this._kafka_consumer.destroy.bind(this._kafka_consumer),
		], callback);
	}


	private _handle_consumer_error(err:Error) {
		this._logger.error(err, "consumer error");
	}

	private _handle_event(kafka_msg:any, callback:()=>void) {
		this._logger.debug("event received: %s", JSON.stringify(kafka_msg));

		callback();
	}


}
