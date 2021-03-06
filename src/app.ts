/**
 * Created by pedro.barreto@bynder.com on 15/Jan/2019.
 */
"use strict";

const start_time = Date.now();

import {Microservice, ConsoleLogger} from "node-microsvc-lib";

// factories/modules
import {RequestLogger} from "./factories/request_logger";
import {HealthCheck} from "./factories/health_check";
import {TestRestCtrl} from "./factories/rest_service";
import {TestEventHandler} from "./factories/event_handler";


// configs
import configs = require("./config/config");

const logger = new ConsoleLogger();

// create microservice app
const app = new Microservice(configs, logger);


app.register_dependency("logger", logger);

app.register_factory("request_logger", RequestLogger);
app.register_factory("test_rest_ctrl", TestRestCtrl);
app.register_factory("health_check", HealthCheck);
app.register_factory("test_event_handler", TestEventHandler);


process.on("uncaughtException", (err:Error)=>{
	logger.fatal(err);
});

app.init((err?: Error) => {
	if (err)
		return console.error(err);

	logger.info("APP STARTED - took %d ms", Date.now()-start_time);
});
