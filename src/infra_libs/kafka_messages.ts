/**
 * Created by pedrosousabarreto@gmail.com on 17/Jan/2019.
 */
"use strict";

export interface IEventStoreMessageHeader{
	msg_id: string; // unique per message
	msg_timestamp: number;
	msg_key:string; // usually the id of the entity (used for partitioning)
	msg_topic:string;
	msg_schema_name:string // command or event name (relative to the payload)
	msg_schema_version:string // command or event payload structure version
	source_system_name:string // source system name
	source_system_instance_id:string // source system name instance id
	correlation_id:string // transaction id, gets passed to other systems
	entity_id:string; // entity OR aggregate id
	entity_version:string; // which entity version this command should be executed or event should be applied to
}

export interface IEventStoreMessage{
	header:IEventStoreMessageHeader;
	payload:any;
}