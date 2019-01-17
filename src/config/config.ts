/**
 * Created by pedro.barreto@bynder.com on 15/Jan/2019.
 */
"use strict";


import {ServiceConfigs, AppBaseConfigs} from "node-microsvc-lib";
import svc_params = require("./params");

let app_base_confs = new AppBaseConfigs();
app_base_confs.env = process.env.NODE_ENV || 'dev_local';
app_base_confs.solution_name = "BynderAPI_V2";
app_base_confs.app_name = "node_http_service_skel";
app_base_confs.app_version = "0.0.1";
app_base_confs.app_api_prefix = "";
app_base_confs.app_api_version = "1";

/*
	If LOCAL_OVERRIDES env var is set then call the correspondent file passing
 	along AppBaseConfigs and ServiceParams for it to modify accordingly

 	file name is config.app_base_confs.env.js - app_base_confs.env is set from NODE_ENV or dev_local if no NODE_ENV is set
*/

if(process.env.hasOwnProperty("LOCAL_OVERRIDES")){
	try{
		let filename = "./config." + app_base_confs.env + ".js";
		require(filename)(app_base_confs, svc_params);
	} catch(e){
		console.log("error on LOCAL_OVERRIDES");
	}
}

// exports a ServiceConfigs instance
export = new ServiceConfigs(svc_params, null, app_base_confs);