/**
 * Created by pedro.barreto@bynder.com on 15/Jan/2019.
 */
"use strict";
import * as express from "express";


import {ILogger,IDiFactory, ServiceConfigs} from "node-microsvc-lib";


export class HealthCheck implements IDiFactory {
	private _name = "HealthCheck";
	private _configs: ServiceConfigs;
	private _express_app: express.Application;

	private _logger: ILogger;

	get name() {
		return this._name;
	};

	constructor(configs: ServiceConfigs, express_app: express.Application, logger:ILogger) {
		this._configs = configs;
		this._express_app = express_app;
		this._logger = logger;
	}

	init(callback: (err?: Error) => void) {
		this._logger.info("%s initialising...", this.name);

		this._inject_routes((err?:Error)=>{
			if(err) {
				this._logger.error(err, this.name+" Error initializing");
				return callback(err);
			}

			this._logger.info("%s initialised", this.name);
			callback();
		});
	}

	destroy(callback:()=>void){
		this._logger.info("%s - destroying...", this.name);
		callback();
	}

	private _inject_routes(callback: (err?: Error) => void) {
		this._logger.info("%s initialising routes...", this.name);

		// hook health check
		this._express_app.get('/_health_check', this._health_check_handler.bind(this));

		// respond immediately - this is being called from some init() fn
		callback(undefined)
	}

	private _health_check_handler(req: express.Request, res: express.Response, next: express.NextFunction) {
		// TODO add overrideable custom handler
		res.status(200).json({status: "ok"});
	}
}
