/**
 * Created by pedrosousabarreto@gmail.com on 31/Jan/2019.
 */
"use strict";


const prom_client = require('prom-client');
import * as express from "express";
import {IDiFactory, ILogger, ServiceConfigs} from "node-microsvc-lib";

const my_path = "/metrics";

export class Metrics implements IDiFactory {
	private _name = "Metrics";
	private _configs: ServiceConfigs;
	private _express_app: express.Application;
	private _histograms:Map<string, any>;

	private _logger: ILogger;

	get name() {
		return this._name;
	};

	constructor(configs: ServiceConfigs, express_app: express.Application, logger:ILogger) {
		this._configs = configs;
		this._express_app = express_app;
		this._logger = logger;

		this._histograms = new Map<string, any>();
	}

	init(callback: (err?: Error) => void) {
		this._logger.info("%s initialising...", this.name);

		const options = {timeout: 5000, prefix: 'node'};
		prom_client.collectDefaultMetrics(options);

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

		let router = express.Router();

		router.get("/",
			this._handler_get_metrics.bind(this)
		);

		this._express_app.use(my_path, router);

		this.get_histogram("test_histo").observe(10);

		// respond immediately - this is being called from some init() fn
		callback()
	}


	private _handler_get_metrics(req: express.Request, res: express.Response, next: express.NextFunction) {


		return res.send(prom_client.register.metrics());

	}

	public get_histogram(name:string, help?:string, label_names?:string[]) {
		if (this._histograms.has(name))
			return this._histograms.get(name);

		if(!label_names)
			label_names = [];

		try {
			const hist = new prom_client.Histogram({
				// name: `${this._configs.app_full_name}_${name}`,
				name: name,
				help: help || `${name}_histogram`,
				labelNames: label_names,
				buckets: [0.010, 0.050, 0.1, 0.5, 1, 2, 5] // this is in seconds - the startTimer().end() collects in seconds with ms precision
			});
			this._histograms.set(name, hist);
			return hist;
		} catch (e) {
			this._logger.error(e);
			throw new Error(`Couldn't get metrics histogram for ${name}`)
		}
	}
}
