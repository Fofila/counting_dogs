/*
  list of the partecipants of the ops from discord (for now)
  API for PS2 and discord from .env

  https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot

  https://discord.com/developers/applications/794697883596881940/information

  http://census.daybreakgames.com/get/ps2:v2/characters_event/?character_id=5428016459730317697,5428117870052769409&c:limit=100&type=KILL,DEATH
  http://census.daybreakgames.com/s:example/json/get/ps2:v2/character/5428016459730317697
  http://census.daybreakgames.com/get/ps2:v2/character/?name.first_lower=pholanx

  it is necessary to create a ws
  wss://push.planetside2.com/streaming?environment=[ps2|ps2ps4us|ps2ps4eu]&service-id=s:Fofila

  {
    "service":"event",
    "action":"subscribe",
    "characters":["5428010618015189713"],
    "eventNames":["Death",
			"FacilityControl",
			"GainExperience",
			"MetagameEvent",
			"PlayerFacilityCapture",
			"PlayerFacilityDefend",
			"VehicleDestroy"]
  }

  "GainExperience":{
		"amount":"",
		"character_id":"",
		"event_name":"GainExperience",
		"experience_id":"",
		"loadout_id":"",
		"other_id":"",
		"timestamp":"",
		"world_id":"",
		"zone_id":""
	},
*/
const dotenv = require('dotenv');

const url = `wss://push.planetside2.com/streaming?environment=ps2&service-id=s:${process.env.PORT}`
const connection = new WebSocket(url)

connection.onerror = error => {
  console.error(`WebSocket error: ${error}`)
}
connection.onopen = () => {
  console.info('Connection to PS2 server open!')
  connection.send('hey')
}