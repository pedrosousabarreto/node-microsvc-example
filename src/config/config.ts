/**
 * Created by pedrosousabarreto@gmail.com on 15/Jan/2019.
 */
"use strict";

import {ServiceConfigs, AppBaseConfigs} from "node-microsvc-lib";
import {IConfigsProvider} from "node-microsvc-lib";
import {HashicorpVaultProvider} from "node-microsvc-lib";

let app_base_confs = new AppBaseConfigs();
app_base_confs.env = process.env.NODE_ENV || 'dev_local';
app_base_confs.solution_name = "ExampleAPI_V2";
app_base_confs.app_name = "node_http_service_example";
app_base_confs.app_version = "0.0.1";
app_base_confs.app_api_prefix = "";

app_base_confs.app_api_version = "1";

// First load the required params with their default values
import svc_params = require("./params");

// check if overrides is enabled and an override file exists and if so, apply it
svc_params.override_from_env_file(app_base_confs);

// custom config loader
let conf_provider: IConfigsProvider;
if(process.env.hasOwnProperty("VAULT_URL") && process.env.hasOwnProperty("VAULT_TOKEN")) {
	const vault_url = process.env["VAULT_URL"] || ""; // "http://localhost:8200";
	const vault_token = process.env["VAULT_TOKEN"] || ""; // "myroot";
	conf_provider = new HashicorpVaultProvider(app_base_confs.solution_name, app_base_confs.app_name, vault_url, vault_token);
}

// exports a ServiceConfigs instance
//@ts-ignore
export = new ServiceConfigs(svc_params, conf_provider, app_base_confs);