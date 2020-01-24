/**
 * Created by pedrosousabarreto@gmail.com on 15/Feb/2019.
 */
"use strict";

import {AppBaseConfigs,ServiceParams, ServiceParam, PARAM_TYPES} from "node-microsvc-lib";

module.exports = function(app_base_confs:AppBaseConfigs, service_params:ServiceParams){
	// do whatever overrides with it

	service_params.add_param(new ServiceParam("kafka_conn_string", PARAM_TYPES.STRING,
		"192.168.64.3:32092", "kafka broker connection string - ex: 127.0.0.1:9092"));

};