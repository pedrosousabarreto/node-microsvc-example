/**
 * Created by pedro.barreto@bynder.com on 15/Jan/2019.
 */
"use strict";

import * as express from "express";
import * as body_parser from "body-parser";
import * as assert from "assert";

import {ILogger,IDiFactory, ServiceConfigs} from "node-microsvc-lib";


const my_path = "/test";

export class
TestRestCtrl implements IDiFactory {
	private _name = "TestRestCtrl";
	private _configs: ServiceConfigs;
	private _express_app: express.Application;


	private _logger: ILogger;


	get name() {
		return this._name;
	};

	constructor(configs: ServiceConfigs, express_app: express.Application, logger: ILogger) {
		this._configs = configs;
		this._express_app = express_app;
		this._logger = logger.create_child({component: this.name});

		// check all necessary configs are available
		assert.ok(configs.get_param_value("ext_base_url"));
	}

	init(callback: (err?: Error) => void) {
		this._logger.info("%s initialising factory: %s ...", this.name);


		this._inject_routes((err?:Error)=>{
			if (err)
				this._logger.error(err, "error initializing");
			else
				this._logger.info("initialized");

			callback(err);
		});


	}

	destroy(callback:()=>void){
		this._logger.info("%s - destroying...", this.name);

		setTimeout(()=>{
			callback();
		});
		// use async.parallel or sequence for multiple initializations
	}

	public get_some(){}

	private _inject_routes(callback: (err?: Error) => void) {
		this._logger.info("initialising routes...");

		let router = express.Router();

		// TODO new way of body parse

		router.use(body_parser.urlencoded({extended: false}));
		router.use(body_parser.json());

		router.use(this._request_middleware_example.bind(this));

		router.get("/",
			this._handler_get_root.bind(this)
		);

		this._express_app.use(this._configs.app_base_url + my_path, router);

		this._logger.info(`routes injected at ${this._configs.app_base_url + my_path}`);

		callback()
	}

	private _request_middleware_example(req: express.Request, res: express.Response, next: express.NextFunction) {

		next();
	}
	/****************************************************
	 * POST cmd handler
	 ****************************************************/



	private _handler_get_root(req: express.Request, res: express.Response, next: express.NextFunction) {

		return res.send({
			correlation_id: res.locals["correlation_id"],
			service: this.name
		});

	}



}
