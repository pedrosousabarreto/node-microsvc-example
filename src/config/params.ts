/**
 * Created by pedro.barreto@bynder.com on 15/Jan/2019.
 */
"use strict";


import {ServiceParams, ServiceParam, PARAM_TYPES, ServiceFeatureFlag} from "node-microsvc-lib";

let params = new ServiceParams();


params.add_param(new ServiceParam("http_port",
	PARAM_TYPES.NUMBER, 3000,
	"http port for the service to listen on"));
params.add_param(new ServiceParam("ext_base_url", PARAM_TYPES.STRING, "https://localhost", "external base url, ex: https://localhost:443"));

// Examples:
// params.add_param(new ServiceParam("kafka_test_events_topic", PARAM_TYPES.STRING, "test_events", "topic for test events"));
//
// params.add_param(new ServiceParam("redis_conn_str", PARAM_TYPES.STRING,
// 	"redis://localhost:6379", "redis connection string"));
//
// params.add_param(new ServiceParam("kafka_test_cmds_topic", PARAM_TYPES.STRING, "test_cmds", "topic for test commands"));
//
// params.add_param(new ServiceParam("kafka_conn_string", PARAM_TYPES.STRING,
// 	"localhost:9092", "kafka broker connection string"));
//
// params.add_param(new ServiceParam("mongodb_conn_string", PARAM_TYPES.STRING,
// 	"mongodb://localhost:27017/test?replicaSet=rs",
// 	"mongo db connection string"
// ));

params.add_feature_flag(new ServiceFeatureFlag("RUN_EXPRESS_APP",
	true, "start the express application"));

export = params;