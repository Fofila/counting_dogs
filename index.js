const utils = require("./utils");
const dotenv = require('dotenv');
const WebSocket = require('ws');
const got = require('got');
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const logger = require('pino')({
  "timestamp":false
})

require('dotenv').config();

const list_of_names = [];
const dict_of_values = {};
const list_of_squads = [];
const global = {};
const prefix = process.env.DISCORD_COMMAND_PREFIX;

/*
given the name of the player, the info(params) needed and the dictionary you want to populate
call the PS2 API and add the response to the dict
*/
async function setIDfromName(name=null, params="&c:show=character_id", dict=dict_of_values, squad='', columns=[]){
  // TODO: if name is empty crash
  try {
    let response = await got(`http://census.daybreakgames.com/get/ps2:v2/character/?name.first_lower=${name}${params}`);
    let player = JSON.parse(response.body).character_list[0];
    // console.log(utils.stamp_now(), player)
    dict[player.character_id] = {}
    dict[player.character_id]["name"] = player.name.first;
    dict[player.character_id]["squad"] = squad;
    for (let i = 0; i < columns.length; i++) {
      dict[player.character_id][columns[i]] = 0
    }
    console.log(utils.stamp_now(), dict);
  } catch (error) {
    console.log(utils.stamp_now(), error);
  }
}

/*
function that creates the connection to the WS
*/
async function createWSConnection(url_to_ws, onclose){
  const connection = new WebSocket(url_to_ws)
  connection.onerror = error => {console.error(`WebSocket error: ${error}`)}
  connection.onclose = onclose;
  return connection;
}

/*
from a list of names get the ID and populate the obj with the exp requested
*/
async function populate_names(names, gain_experience_requested){
  for (let i = 0; i < names.length; i++) {
    setIDfromName(names[i]['name'], '', dict_of_values, names[i]['squad'], gain_experience_requested);  
  }
}

/*
  called in "start" command
*/
async function main(gain_experience_requested=["GainExperience_experience_id_1"]){
  let list_of_ids = []
  await populate_names(list_of_names, gain_experience_requested);
  
  // console.log(utils.stamp_now(), dict_of_values);

  global.ws = await createWSConnection(`wss://push.planetside2.com/streaming?environment=ps2&service-id=s:${process.env.PS2_TOKEN}`, function(){
    console.log(utils.stamp_now(), dict_of_values);
  });
  global.ws.onopen = () => {
    /*
    add here all the request to the ws
    */
    for (const id in dict_of_values) {
      list_of_ids.push(id);
    }
    console.info(utils.stamp_now(),'Connection to PS2 server open!')
    // ws.send('{"action":"clearSubscribe","all":"true","service":"event"}')
    let message = `{"service":"event","action":"subscribe","characters":[${list_of_ids}],"eventNames":${JSON.stringify(gain_experience_requested)}}`;
    console.log(utils.stamp_now(), message);
    global.ws.send(message)
  }

  /*
    navigate di e.data to get the value needed
    TODO: add a list as a log of events
  */
  global.ws.onmessage = (e) => {
    let message_dict = JSON.parse(e.data);
    if(message_dict.type !== "heartbeat"){
      // it is a useful message
      // console.log(utils.stamp_now(), message_dict)
      if(message_dict.type === "serviceMessage"){
        console.log(utils.stamp_now(), message_dict)
        // TODO: if not payload skip
        updateValue(dict_of_values, message_dict.payload)
      }
    }
    // {"payload":{"amount":"75","character_id":"5428016459730317697","event_name":"GainExperience","experience_id":"7","loadout_id":"4","other_id":"5428716652642740209","timestamp":"1609584372","world_id":"13","zone_id":"4"},"service":"event","type":"serviceMessage"}
    // {"online":{"EventServerEndpoint_Cobalt_13":"true","EventServerEndpoint_Connery_1":"true","EventServerEndpoint_Emerald_17":"true","EventServerEndpoint_Jaeger_19":"true","EventServerEndpoint_Miller_10":"true","EventServerEndpoint_Soltech_40":"true"},"service":"event","type":"heartbeat"}
  }
}

/*
  given the dict to update and the value
  update the dict, incrementing the counter of that experience gain
  it expects the dict as follows:
  {
    <id>:{"name":<name>, "GainExperience_experience_id_N":<heals>, etc }
  }
  and the value as:
  {"amount":"75","character_id":"5428016459730317697","event_name":"GainExperience","experience_id":"7","loadout_id":"4","other_id":"5428716652642740209","timestamp":"1609584372","world_id":"13","zone_id":"4"}
  or at least
  {"character_id":"5428016459730317697","experience_id":"7", "other_id":"8291480109032191665"}
*/
function updateValue(dict, value){
  // TODO: if value["character_id"] throw error
  // TODO: if value["experience_id"] throw error
  let other_id = (dict[value['other_id']]) ? dict[value['other_id']]['name'] : value['other_id'];
  let character_id = value['character_id'];
  if(dict[value['character_id']]){
    character_id = dict[value['character_id']]["name"]
    if(dict[value['character_id']][`GainExperience_experience_id_${value["experience_id"]}`]){
      dict[value['character_id']][`GainExperience_experience_id_${value["experience_id"]}`]++
    }else{
      dict[value['character_id']][`GainExperience_experience_id_${value["experience_id"]}`] = 1
    }
  }
  
  console.log(utils.stamp_now(), character_id, type_gain_experience[`GainExperience_experience_id_${value["experience_id"]}`], other_id)
  
  console.log(utils.stamp_now(), dict)
}

function closeConnection(websocket=global.ws, before = null, after = null){
  if(before !== null) before();
  websocket.onclose = after
  websocket.terminate();
  // if(after !== null)  after();
  console.log(utils.stamp_now(), 'Connection closed')
}

client.once('ready', () => {
  console.log(utils.stamp_now(), 'Bot online!')
})

client.on('message', message => {
  if(!message.content.startsWith(prefix) || message.author.bot) return
  // console.log(utils.stamp_now(), message)
  //console.log(utils.stamp_now(), message.guild)
  // console.log(utils.stamp_now(), message.author.username)
  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();
  // console.log(utils.stamp_now(), command, args)

if(command === 'ping'){ // ping the server
    // TODO: make a real ping
    message.channel.send('pong!');
  } else if(command === 'help'){ // list commands
    const embed = new Discord.MessageEmbed()
      .setTitle(`Commands`)
      .setColor(0xffffff)
      // TODO: update commands
    let res = 'Join a squad: join <squadname>\n';
    res += 'Leave a squad: leave <squadname>\n';
    res += 'See members of a squad: get squad <squadname>\n';
    res += 'see all squads: get squads\n';
    res += 'help\n';
    if (message.member.hasPermission('ADMINISTRATOR') || message.member.hasPermission('MANAGE_CHANNELS') || message.member.hasPermission('MANAGE_GUILD')){
      res += 'insert name (add <name> <squad>)\n';
      res += 'remove name (remove <name> <squad>)\n';
      res += 'clear all (clearall)\n';
      res += 'clear squad (clear <squad>)\n';
      res += 'add squad (add squad <squad>)\n';
      res += 'remove squad (remove squad <squad>)\n';
      res += 'start recording (start "<opsname>")\n';
      res += 'stop recording (stop)\n';
      // res += 'stop all (stop)\n';
    }
    embed.setDescription(res);
    message.channel.send(embed);
  } else if(command === 'join'){ // insert name (join <squad>)
    let squad = args[0];
    let name = utils.clearName(message.author.username);
    const embed = new Discord.MessageEmbed()
    if(list_of_squads.indexOf(squad) !== -1){
      for (let i = 0; i < list_of_names.length; i++) {
        if(list_of_names[i]['name'] === name){
          embed.setTitle(`Warning`).setColor(0xffff00)
          embed.setDescription(`You are in the ${list_of_names[i]['squad']} squad, if you want to change squad type: !leave ${list_of_names[i]['squad']}`);
          message.channel.send(embed);
          return;
        }
      }
      let number = 0
      try {
        number = utils.getSquad(list_of_names)[squad].length
      } catch (error) {
        number = 0
      }
      if(number < 12){
        list_of_names.push({'name':name,'squad':squad});
        embed.setTitle(`Success`).setColor(0x00ff00);
        embed.setDescription(`You joined ${squad} squad`);
      }else{
        embed.setTitle(`Warning`).setColor(0xffff00)
        embed.setDescription(`The ${squad} squad is full :(`);
      }
    }else{
      embed.setTitle(`Error`).setColor(0xff0000)
      embed.setDescription(`There is no squad ${squad} :(`);
    }
    message.channel.send(embed);
  } else if(command === 'leave'){ // remove name (leave <squad>)
    let name = utils.clearName(message.author.username);
    for (let i = 0; i < list_of_names.length; i++) {
      if(list_of_names[i]['name'] === name){
        let squad = list_of_names[i]['squad']
        list_of_names.splice(i)
        const msg = new Discord.MessageEmbed()
          .setTitle(`Leaved squad`)
          .setColor(0x00ff00)
        msg.setDescription(`You left ${squad}`);
        message.channel.send(msg);
        return;
      }
    }
  } else if(command === 'get' && args[0] === 'squad' && args[1] !== undefined){ // see squad (get squad <squad>)
    let squad = args[1];
    let res = '';
    let number = 0
    try {
      number = utils.getSquad(list_of_names)[squad].length
    } catch (error) {
      number = 0
    }
    const embed = new Discord.MessageEmbed()
      .setTitle(`Squad ${squad} ${number}/12`)
      .setColor(0xffffff)
      
    if(list_of_squads.indexOf(squad) !== -1){
      for (let i = 0; i < list_of_names.length; i++) {
        if(list_of_names[i]['squad'] === squad){
          res += `${list_of_names[i]['name']}\n`
        }
      }
    }else{
      embed.setColor(0xff0000);
      res = `There is no squad ${squad}`;
    }
    embed.setDescription(res);
    message.channel.send(embed);
  } else if(command === 'get' && args[0] === 'squads'){ // see all squad (get squad)
    for (let i = 0; i < list_of_squads.length; i++) {
      let res = '';
      let squad = list_of_squads[i];
      let number = 0
      try {
        number = utils.getSquad(list_of_names)[squad].length
      } catch (error) {
        number = 0
      }
      const embed = new Discord.MessageEmbed()
        .setTitle(`Squad ${squad} ${number}/12`)
        .setColor(0xffffff)
      for (let j = 0; j < list_of_names.length; j++) {
        if(list_of_names[j]['squad'] === squad){
          res += `${list_of_names[j]['name']}\n`
        }
      }
      embed.setDescription(res);
      message.channel.send(embed);
    }
  } else if(command === 'add' && args[0] === 'squad'){ // add squad (add squad <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      const error = new Discord.MessageEmbed()
        .setTitle(`Permission error`)
        .setColor(0xff0000)
      error.setDescription("Hey! You don't the permission to do that!");
      message.channel.send(error);
      return;
    }
    let squad = args[1];
    list_of_squads.push(squad);
    message.channel.send(`Added squad ${squad}`);
  } else if(command === 'add'){ // insert name (add <name> <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      const error = new Discord.MessageEmbed()
        .setTitle(`Permission error`)
        .setColor(0xff0000)
      error.setDescription("Hey! You don't the permission to do that!");
      message.channel.send(error);
    }
    let squad = args[1];
    let name = utils.clearName(args[0]);
    const embed = new Discord.MessageEmbed();
    if(list_of_squads.indexOf(squad) !== -1){
      for (let i = 0; i < list_of_names.length; i++) {
        if(list_of_names[i]['name'] === name){
          embed.setTitle(`Warning`).setColor(0xffff00)
          embed.setDescription(`${name} is in the ${list_of_names[i]['squad']} squad, you have to remove from the other squad: !remove ${name} ${list_of_names[i]['squad']}`);
          message.channel.send(embed);
          return;
        }
      }
      let number = 0
      try {
        number = utils.getSquad(list_of_names)[squad].length
      } catch (error) {
        number = 0
      }
      if(number < 12){
        list_of_names.push({'name':name,'squad':squad});
        embed.setTitle(`Success`).setColor(0x00ff00);
        embed.setDescription(`${name} added to squad ${squad}`);
      }else{
        embed.setTitle(`Warning`).setColor(0xffff00)
        embed.setDescription(`The ${squad} squad is full :(`);
      }
    }else{
      embed.setTitle(`Warning`).setColor(0xffff00)
      embed.setDescription(`There is no squad ${squad} :(`);
    }
    message.channel.send(embed);
  } else if(command === 'clear' && args[0] === 'all'){ // clear all (clear all)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      const error = new Discord.MessageEmbed()
        .setTitle(`Permission error`)
        .setColor(0xff0000)
      error.setDescription("Hey! You don't the permission to do that!");
      message.channel.send(error);
      return;
    }
    for (let i = 0; i < list_of_squads.length; i++) {
      let clean_msg = utils.clearSquad(list_of_squads[i], list_of_squads, list_of_names)
      let msg = new Discord.MessageEmbed()
        .setTitle(clean_msg.title)
        .setColor(clean_msg.color)
      msg.setDescription(clean_msg.text);
      message.channel.send(msg);
    }
    for (let j = 0; j < list_of_names.length; j++) {
      list_of_names.pop()
    }
  } else if(command === 'clear'){ // clear squad (clear <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      const error = new Discord.MessageEmbed()
        .setTitle(`Permission error`)
        .setColor(0xff0000)
      error.setDescription("Hey! You don't the permission to do that!");
      message.channel.send(error);
      return;
    }
    let name = args[0];
    let clean_msg = utils.clearSquad(name, list_of_squads, list_of_names)
    let msg = new Discord.MessageEmbed()
      .setTitle(clean_msg.title)
      .setColor(clean_msg.color)
    msg.setDescription(clean_msg.text);
    message.channel.send(msg);
/*   } else if(command === 'stop' && args[0] === 'all'){ // stop all (stop)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      const error = new Discord.MessageEmbed()
        .setTitle(`Permission error`)
        .setColor(0xff0000)
      error.setDescription("Hey! You don't the permission to do that!");
      message.channel.send(error);
      return;
    } */
  } else if(command === 'stop'){ // stop recording (stop)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      const error = new Discord.MessageEmbed()
        .setTitle(`Permission error`)
        .setColor(0xff0000)
      error.setDescription("Hey! You don't the permission to do that!");
      message.channel.send(error);
      return;
    }
    closeConnection(global.ws, null, function(){
      const msg = new Discord.MessageEmbed()
        .setTitle(`Record`)
        .setColor(0xffffff)
      msg.setDescription("Stats recording stopped");
      message.channel.send(msg);
      fs.writeFile(`${global.ops_name}.json`, JSON.stringify(dict_of_values), (err) => {
        if (err) {
            throw err;
        }
        console.log(utils.stamp_now(),"JSON data is saved.");
      });
      message.channel.send(Discord.MessageAttachment(utils.toHtmlTable(global.ops_name,dict_of_values, type_gain_experience)));
    });
  } else if(command === 'start'){ // start recording (start "<opsname>")
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      const error = new Discord.MessageEmbed()
        .setTitle(`Permission error`)
        .setColor(0xff0000)
      error.setDescription("Hey! You don't the permission to do that!");
      message.channel.send(error);
      return;
    }
    if(args[0] !== undefined){
      global.ops_name = args[0];
    } else {
      let now = new Date();
      let date = (('' + now.getUTCDate()).length === 1) ? '0'+now.getUTCDate() : now.getUTCDate()
      let month = (('' + now.getUTCMonth()).length === 1) ? '0'+(now.getUTCMonth()+1) : now.getUTCMonth()+1
      global.ops_name = `${now.getUTCFullYear()}${month}${date}_ops`
    }
    
    if(args.length > 1){
      let exp_type = [];
      let list = '';
      for (let i = (args.length - 1); i > 0; i--) {
        let text = `GainExperience_experience_id_${args[i]}`
        exp_type.push(text);
        list += `${type_gain_experience[text]}\n`
      }
      const msg = new Discord.MessageEmbed()
        .setTitle(`Record`)
        .setColor(0xffffff)
      msg.setDescription(`Starting recording the following stat\n${list}`);
      main(exp_type);
    }else{
      const msg = new Discord.MessageEmbed()
        .setTitle(`Record`)
        .setColor(0xffffff)
      msg.setDescription("Hey! You don't the permission to do that!");
      main();
    }
    message.channel.send(msg);
  } else if(command === 'remove' && args[0] === 'squad'){ // remove squad (remove squad <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      const error = new Discord.MessageEmbed()
        .setTitle(`Permission error`)
        .setColor(0xff0000)
      error.setDescription("Hey! You don't the permission to do that!");
      message.channel.send(error);
      return;
    }
    let squad = args[1];
    if(list_of_squads.indexOf(squad) !== -1){
      let clean_msg = utils.clearSquad(squad, list_of_squads, list_of_names)
      list_of_squads.splice(list_of_squads.indexOf(squad));
      let msg = new Discord.MessageEmbed()
        .setTitle(`Removed squad ${squad}`)
        .setColor(0xffffff)
      message.channel.send(msg);
      console.log(clean_msg)
      let msg1 = new Discord.MessageEmbed()
        .setTitle(clean_msg.title)
        .setColor(clean_msg.color)
      msg1.setDescription(clean_msg.text);
      message.channel.send(msg1);
    }else{
      message = `There is no squad ${squad}`;
    }
  } else if(command === 'remove'){ // remove name (remove <name> <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      const error = new Discord.MessageEmbed()
        .setTitle(`Permission error`)
        .setColor(0xff0000)
      error.setDescription("Hey! You don't the permission to do that!");
      message.channel.send(error);
      return;
    }
    let name = args[0];
    let squad = args[1];
    for (let i = 0; i < list_of_names.length; i++) {
      console.log(name, squad, list_of_names[i]['name'], list_of_names[i]['squad'])
      if(list_of_names[i]['name'] === name && list_of_names[i]['squad'] === squad){
        list_of_names.splice(list_of_names.indexOf(squad));
        let msg = new Discord.MessageEmbed()
          .setTitle(`${name} was removed from the ${squad} squad`)
          .setColor(0xffffff)
        message.channel.send(msg);
      }else if(list_of_names[i]['name'] === name && list_of_names[i]['squad'] !== squad){
        let msg = new Discord.MessageEmbed()
          .setTitle(`Error`)
          .setColor(0xff0000)
          .setDescription(`${name} is not in the ${list_of_names[i]['squad']} squad, if you want to remove ${name} type: !remove ${name} ${list_of_names[i]['squad']}`)
        message.channel.send(msg);
        return;
      }else if(list_of_names[i]['name'] !== name && list_of_names[i]['squad'] === squad){
        let msg = new Discord.MessageEmbed()
          .setTitle(`Warning`)
          .setColor(0xffff00)
          .setDescription(`There is no ${name} in the ${list_of_names[i]['squad']} squad. Check again the name, please`)
        message.channel.send(msg);
        return;
      }else{
        let msg = new Discord.MessageEmbed()
        .setTitle(`What are you writing? Please check again`)
        .setColor(0xff0000)
        message.channel.send(msg);
        return;
      }
    }
  }else if(command === 'dict_of_values'){  
    message.channel.send(JSON.stringify(dict_of_values));
  }else if(command === 'list_of_names'){
    message.channel.send(JSON.stringify(list_of_names));
  }else if(command === 'list_of_squads'){
    message.channel.send(JSON.stringify(list_of_squads));
  }else{
    message.channel.send("Sorry I didn't understand, can you repeat, please? Or type !help for the list of commands");
  }
})

client.login(process.env.BOT_TOKEN)

// list of types of experience
const type_gain_experience = {
  "GainExperience_experience_id_1":"Kill Player",
  "GainExperience_experience_id_2":"Kill Player Assist",
  "GainExperience_experience_id_3":"Kill Player Spawn Assist",
  "GainExperience_experience_id_4":"Heal Player",
  "GainExperience_experience_id_5":"Heal Assist",
  "GainExperience_experience_id_6":"MAX Repair",
  "GainExperience_experience_id_7":"Revive",
  "GainExperience_experience_id_8":"Kill Streak",
  "GainExperience_experience_id_10":"Domination Kill",
  "GainExperience_experience_id_11":"Revenge Kill",
  "GainExperience_experience_id_15":"Control Point - Defend",
  "GainExperience_experience_id_16":"Control Point - Attack",
  "GainExperience_experience_id_19":"Facility Captured (Not Used)",
  "GainExperience_experience_id_21":"Destroy Secondary Objective",
  "GainExperience_experience_id_22":"Destroy SecondaryObjectiveAssist",
  "GainExperience_experience_id_24":"Vehicle Destruction - Flash",
  "GainExperience_experience_id_25":"Multiple Kill",
  "GainExperience_experience_id_26":"Vehicle RoadKill",
  "GainExperience_experience_id_28":"Squad Repair - Flash",
  "GainExperience_experience_id_29":"Kill Player Class MAX",
  "GainExperience_experience_id_30":"Transport Assist",
  "GainExperience_experience_id_31":"Vehicle Repair - Flash",
  "GainExperience_experience_id_32":"Nemesis Kill",
  "GainExperience_experience_id_34":"Resupply Player",
  "GainExperience_experience_id_36":"Spot Kill",
  "GainExperience_experience_id_37":"Headshot",
  "GainExperience_experience_id_38":"Stop Kill Streak",
  "GainExperience_experience_id_47":"Meta Game Event reward",
  "GainExperience_experience_id_51":"Squad Heal",
  "GainExperience_experience_id_53":"Squad Revive",
  "GainExperience_experience_id_54":"Squad Spot Kill",
  "GainExperience_experience_id_55":"Squad Resupply",
  "GainExperience_experience_id_56":"Squad Spawn",
  "GainExperience_experience_id_57":"Destroy Engineer Turret",
  "GainExperience_experience_id_58":"Vehicle Destruction - Phalanx",
  "GainExperience_experience_id_59":"Vehicle Destruction - Drop Pod",
  "GainExperience_experience_id_60":"Vehicle Destruction - Galaxy",
  "GainExperience_experience_id_61":"Vehicle Destruction - Liberator",
  "GainExperience_experience_id_62":"Vehicle Destruction - Lightning",
  "GainExperience_experience_id_63":"Vehicle Destruction - Magrider",
  "GainExperience_experience_id_64":"Vehicle Destruction - Mosquito",
  "GainExperience_experience_id_65":"Vehicle Destruction - Prowler",
  "GainExperience_experience_id_66":"Vehicle Destruction - Reaver",
  "GainExperience_experience_id_67":"Vehicle Destruction - Scythe",
  "GainExperience_experience_id_68":"Vehicle Destruction - Sunderer",
  "GainExperience_experience_id_69":"Vehicle Destruction - Vanguard",
  "GainExperience_experience_id_72":"Vehicle Ram Bonus",
  "GainExperience_experience_id_73":"Vehicle Ram Kill - Engi Turret",
  "GainExperience_experience_id_74":"Vehicle Ram Kill - Phalanx",
  "GainExperience_experience_id_75":"Vehicle Ram Kill - Drop Pod",
  "GainExperience_experience_id_76":"Vehicle Ram Kill - Galaxy",
  "GainExperience_experience_id_77":"Vehicle Ram Kill - Liberator",
  "GainExperience_experience_id_78":"Vehicle Ram Kill - Lightning",
  "GainExperience_experience_id_79":"Vehicle Ram Kill - Magrider",
  "GainExperience_experience_id_80":"Vehicle Ram Kill - Mosquito",
  "GainExperience_experience_id_81":"Vehicle Ram Kill - Prowler",
  "GainExperience_experience_id_82":"Vehicle Ram Kill - Reaver",
  "GainExperience_experience_id_83":"Vehicle Ram Kill - Scythe",
  "GainExperience_experience_id_84":"Vehicle Ram Kill - Sunderer",
  "GainExperience_experience_id_85":"Vehicle Ram Kill - Vanguard",
  "GainExperience_experience_id_86":"Explosive Destruction",
  "GainExperience_experience_id_87":"Secondary Facility Object Repair",
  "GainExperience_experience_id_88":"Vehicle Repair - Engi Turret",
  "GainExperience_experience_id_89":"Vehicle Repair - Phalanx",
  "GainExperience_experience_id_90":"Vehicle Repair - Drop Pod",
  "GainExperience_experience_id_91":"Vehicle Repair - Galaxy",
  "GainExperience_experience_id_92":"Vehicle Repair - Liberator",
  "GainExperience_experience_id_93":"Vehicle Repair - Lightning",
  "GainExperience_experience_id_94":"Vehicle Repair - Magrider",
  "GainExperience_experience_id_95":"Vehicle Repair - Mosquito",
  "GainExperience_experience_id_96":"Vehicle Repair - Prowler",
  "GainExperience_experience_id_97":"Vehicle Repair - Reaver",
  "GainExperience_experience_id_98":"Vehicle Repair - Scythe",
  "GainExperience_experience_id_99":"Vehicle Repair - Sunderer",
  "GainExperience_experience_id_100":"Vehicle Repair - Vanguard",
  "GainExperience_experience_id_101":"Kill Assist - Flash",
  "GainExperience_experience_id_102":"Kill Assist - Engi Turret",
  "GainExperience_experience_id_103":"Kill Assist - Phalanx",
  "GainExperience_experience_id_104":"Kill Assist - Drop Pod",
  "GainExperience_experience_id_105":"Kill Assist - Galaxy",
  "GainExperience_experience_id_106":"Kill Assist - Liberator",
  "GainExperience_experience_id_107":"Kill Assist - Lightning",
  "GainExperience_experience_id_108":"Kill Assist - Magrider",
  "GainExperience_experience_id_109":"Kill Assist - Mosquito",
  "GainExperience_experience_id_110":"Kill Assist - Prowler",
  "GainExperience_experience_id_111":"Kill Assist - Reaver",
  "GainExperience_experience_id_112":"Kill Assist - Scythe",
  "GainExperience_experience_id_113":"Kill Assist - Sunderer",
  "GainExperience_experience_id_114":"Kill Assist - Vanguard",
  "GainExperience_experience_id_129":"Squad Repair - Engi Turret",
  "GainExperience_experience_id_130":"Squad Repair - Phalanx",
  "GainExperience_experience_id_131":"Squad Repair - Drop Pod",
  "GainExperience_experience_id_132":"Squad Repair - Galaxy",
  "GainExperience_experience_id_133":"Squad Repair - Liberator",
  "GainExperience_experience_id_134":"Squad Repair - Lightning",
  "GainExperience_experience_id_135":"Squad Repair - Magrider",
  "GainExperience_experience_id_136":"Squad Repair - Mosquito",
  "GainExperience_experience_id_137":"Squad Repair - Prowler",
  "GainExperience_experience_id_138":"Squad Repair - Reaver",
  "GainExperience_experience_id_139":"Squad Repair - Scythe",
  "GainExperience_experience_id_140":"Squad Repair - Sunderer",
  "GainExperience_experience_id_141":"Squad Repair - Vanguard",
  "GainExperience_experience_id_142":"Squad MAX Repair",
  "GainExperience_experience_id_143":"Drop Pod Kill",
  "GainExperience_experience_id_146":"Player Kill by Sunderer Gunner",
  "GainExperience_experience_id_148":"Player Kill by Magrider Gunner",
  "GainExperience_experience_id_149":"Player Kill by Vanguard Gunner",
  "GainExperience_experience_id_150":"Player Kill by Prowler Gunner",
  "GainExperience_experience_id_154":"Player Kill by Liberator Gunner",
  "GainExperience_experience_id_155":"Player Kill by Galaxy Gunner",
  "GainExperience_experience_id_159":"Flash Kill by Sunderer Gunner",
  "GainExperience_experience_id_160":"Sunderer Kill by Sunderer Gunner",
  "GainExperience_experience_id_161":"Lightning Kill by Sunderer Gunne",
  "GainExperience_experience_id_162":"Magrider Kill by Sunderer Gunner",
  "GainExperience_experience_id_163":"Vanguard Kill by Sunderer Gunner",
  "GainExperience_experience_id_164":"Prowler Kill by Sunderer Gunner",
  "GainExperience_experience_id_165":"Scythe Kill by Sunderer Gunner",
  "GainExperience_experience_id_166":"Reaver Kill by Sunderer Gunner",
  "GainExperience_experience_id_167":"Mosquito Kill by Sunderer Gunner",
  "GainExperience_experience_id_168":"Lib Kill by Sunderer",
  "GainExperience_experience_id_169":"Galaxy Kill by Sunderer Gunner",
  "GainExperience_experience_id_181":"Flash Kill by Magrider Gunner",
  "GainExperience_experience_id_182":"Sunderer Kill by Magrider Gunner",
  "GainExperience_experience_id_183":"Lightning Kill by Magrider Gunne",
  "GainExperience_experience_id_184":"Vanguard Kill by Magrider Gunner",
  "GainExperience_experience_id_185":"Prowler Kill by Magrider Gunner",
  "GainExperience_experience_id_186":"Reaver Kill by Magrider Gunner",
  "GainExperience_experience_id_187":"Mosquito Kill by Magrider Gunner",
  "GainExperience_experience_id_188":"Lib Kill by Magrider",
  "GainExperience_experience_id_189":"Galaxy Kill by Magrider Gunner",
  "GainExperience_experience_id_190":"Flash Kill by Vanguard Gunner",
  "GainExperience_experience_id_191":"Sunderer Kill by Vanguard Gunner",
  "GainExperience_experience_id_192":"Lightning Kill by Vanguard Gunne",
  "GainExperience_experience_id_193":"Magrider Kill by Vanguard Gunner",
  "GainExperience_experience_id_195":"Prowler Kill by Vanguard Gunner",
  "GainExperience_experience_id_196":"Scythe Kill by Vanguard Gunner",
  "GainExperience_experience_id_197":"Mosquito Kill by Vanguard Gunner",
  "GainExperience_experience_id_198":"Lib Kill by Vanguard",
  "GainExperience_experience_id_199":"Galaxy Kill by Vanguard Gunner",
  "GainExperience_experience_id_200":"Flash Kill by Prowler Gunner",
  "GainExperience_experience_id_201":"Galaxy Spawn Bonus",
  "GainExperience_experience_id_202":"Sunderer Kill by Prowler Gunner",
  "GainExperience_experience_id_203":"Lightning Kill by Prowler Gunner",
  "GainExperience_experience_id_204":"Magrider Kill by Prowler Gunner",
  "GainExperience_experience_id_205":"Vanguard Kill by Prowler Gunner",
  "GainExperience_experience_id_207":"Scythe Kill by Prowler Gunner",
  "GainExperience_experience_id_208":"Reaver Kill by Prowler Gunner",
  "GainExperience_experience_id_209":"Liberator Kill by Prowler Gunner",
  "GainExperience_experience_id_210":"Galaxy Kill by Prowler Gunner",
  "GainExperience_experience_id_211":"Flash Kill by Liberator Gunner",
  "GainExperience_experience_id_212":"Sunderer Kill by Lib Gunner",
  "GainExperience_experience_id_213":"Lightning Kill by Liberator Gunn",
  "GainExperience_experience_id_214":"Magrider Kill by Lib Gunner",
  "GainExperience_experience_id_215":"Vanguard Kill by Lib Gunner",
  "GainExperience_experience_id_216":"Prowler Kill by Liberator Gunner",
  "GainExperience_experience_id_217":"Scythe Kill by Liberator Gunner",
  "GainExperience_experience_id_218":"Reaver Kill by Liberator Gunner",
  "GainExperience_experience_id_219":"Mosquito Kill by Lib Gunner",
  "GainExperience_experience_id_220":"Lib Kill by Liberator",
  "GainExperience_experience_id_221":"Galaxy Kill by Liberator Gunner",
  "GainExperience_experience_id_222":"Flash Kill by Galaxy Gunner",
  "GainExperience_experience_id_223":"Sunderer Kill by Galaxy Gunner",
  "GainExperience_experience_id_224":"Lightning Kill by Galaxy Gunner",
  "GainExperience_experience_id_225":"Magrider Kill by Galaxy Gunner",
  "GainExperience_experience_id_226":"Vanguard Kill by Galaxy Gunner",
  "GainExperience_experience_id_227":"Prowler Kill by Galaxy Gunner",
  "GainExperience_experience_id_228":"Scythe Kill by Galaxy Gunner",
  "GainExperience_experience_id_229":"Reaver Kill by Galaxy Gunner",
  "GainExperience_experience_id_230":"Mosquito Kill by Galaxy Gunner",
  "GainExperience_experience_id_231":"LibKill by Galaxy Gunner",
  "GainExperience_experience_id_232":"Galaxy Kill by Galaxy Gunner",
  "GainExperience_experience_id_233":"Sunderer Spawn Bonus",
  "GainExperience_experience_id_234":"Facility placed bomb",
  "GainExperience_experience_id_235":"Facility defused bomb",
  "GainExperience_experience_id_236":"Facility Terminal Hack",
  "GainExperience_experience_id_237":"Facility Turret Hack",
  "GainExperience_experience_id_240":"Vehicle Resupply",
  "GainExperience_experience_id_241":"Squad Vehicle Resupply",
  "GainExperience_experience_id_242":"Spot Kill - Flash",
  "GainExperience_experience_id_243":"Spot Kill - Engi Turret",
  "GainExperience_experience_id_244":"Spot Kill - Phalanx",
  "GainExperience_experience_id_245":"Spot Kill - Drop Pod",
  "GainExperience_experience_id_246":"Spot Kill - Galaxy",
  "GainExperience_experience_id_247":"Spot Kill - Liberator",
  "GainExperience_experience_id_248":"Spot Kill - Lightning",
  "GainExperience_experience_id_249":"Spot Kill - Magrider",
  "GainExperience_experience_id_250":"Spot Kill - Mosquito",
  "GainExperience_experience_id_251":"Spot Kill - Prowler",
  "GainExperience_experience_id_252":"Spot Kill - Reaver",
  "GainExperience_experience_id_253":"Spot Kill - Scythe",
  "GainExperience_experience_id_254":"Spot Kill - Sunderer",
  "GainExperience_experience_id_255":"Spot Kill - Vanguard",
  "GainExperience_experience_id_256":"Squad Spot Kill - Flash",
  "GainExperience_experience_id_257":"Squad Spot Kill - Engi Turret",
  "GainExperience_experience_id_258":"Squad Spot Kill - Phalanx",
  "GainExperience_experience_id_259":"Squad Spot Kill - Drop Pod",
  "GainExperience_experience_id_260":"Squad Spot Kill - Galaxy",
  "GainExperience_experience_id_261":"Squad Spot Kill - Liberator",
  "GainExperience_experience_id_262":"Squad Spot Kill - Lightning",
  "GainExperience_experience_id_263":"Squad Spot Kill - Magrider",
  "GainExperience_experience_id_264":"Squad Spot Kill - Mosquito",
  "GainExperience_experience_id_265":"Squad Spot Kill - Prowler",
  "GainExperience_experience_id_266":"Squad Spot Kill - Reaver",
  "GainExperience_experience_id_267":"Squad Spot Kill - Scythe",
  "GainExperience_experience_id_268":"Squad Spot Kill - Sunderer",
  "GainExperience_experience_id_269":"Squad Spot Kill - Vanguard",
  "GainExperience_experience_id_270":"Squad Spawn Beacon Kill",
  "GainExperience_experience_id_272":"Convert Capture Point",
  "GainExperience_experience_id_275":"Terminal Kill",
  "GainExperience_experience_id_276":"Terminal Repair",
  "GainExperience_experience_id_277":"Spawn Kill",
  "GainExperience_experience_id_278":"Priority Kill",
  "GainExperience_experience_id_279":"High Priority Kill",
  "GainExperience_experience_id_280":"Lighting Damage (Infantry vs Vehicle)",
  "GainExperience_experience_id_281":"Prowler Damage (Infantry vs Vehicle)",
  "GainExperience_experience_id_283":"Galaxy Damage",
  "GainExperience_experience_id_284":"Liberator Damage",
  "GainExperience_experience_id_285":"Magrider Damage (Infantry vs Vehicle)",
  "GainExperience_experience_id_286":"Mosquito Damage",
  "GainExperience_experience_id_287":"Reaver Damage",
  "GainExperience_experience_id_288":"Scythe Damage",
  "GainExperience_experience_id_289":"Sunderer Damage (Infantry vs Vehicle)",
  "GainExperience_experience_id_290":"Vanguard Damage (Infantry vs Vehicle)",
  "GainExperience_experience_id_291":"Ribbon Experience",
  "GainExperience_experience_id_293":"Motion Detect",
  "GainExperience_experience_id_294":"Squad Motion Spot",
  "GainExperience_experience_id_300":"Vehicle Ram Kill - Harasser",
  "GainExperience_experience_id_301":"Vehicle Destruction - Harasser",
  "GainExperience_experience_id_302":"Squad Repair - Harasser",
  "GainExperience_experience_id_303":"Vehicle Repair - Harasser",
  "GainExperience_experience_id_304":"Kill Assist - Harasser",
  "GainExperience_experience_id_306":"Spot Kill - Harasser",
  "GainExperience_experience_id_307":"Squad Spot Kill - Harasser",
  "GainExperience_experience_id_308":"Harasser Kill by Sunderer Gunne",
  "GainExperience_experience_id_309":"Harasser Kill by Magrider Gunne",
  "GainExperience_experience_id_310":"Harasser Kill by Vanguard Gunne",
  "GainExperience_experience_id_311":"Harasser Kill by Prowler Gunner",
  "GainExperience_experience_id_312":"Harasser Kill by Liberator Gunn",
  "GainExperience_experience_id_313":"Harasser Kill by Galaxy Gunner",
  "GainExperience_experience_id_314":"Player Kill by Harasser Gunner",
  "GainExperience_experience_id_315":"Flash Kill by Harasser Gunner",
  "GainExperience_experience_id_316":"Sunderer Kill by Harasser Gunner",
  "GainExperience_experience_id_317":"Lightning Kill by Harasser Gunne",
  "GainExperience_experience_id_318":"Vanguard Kill by Harasser Gunner",
  "GainExperience_experience_id_319":"Prowler Kill by Harasser Gunner",
  "GainExperience_experience_id_320":"Reaver Kill by Harasser Gunner",
  "GainExperience_experience_id_321":"Mosquito Kill by Harasser Gunner",
  "GainExperience_experience_id_322":"Lib Kill by Harasser",
  "GainExperience_experience_id_323":"Galaxy Kill by Harasser Gunner",
  "GainExperience_experience_id_324":"Harasser Kill by Harasser Gunner",
  "GainExperience_experience_id_325":"Magrider Kill by Harasser Gunner",
  "GainExperience_experience_id_326":"Scythe Kill by Harasser Gunner",
  "GainExperience_experience_id_327":"Tank Mine Despawn/Defusal",
  "GainExperience_experience_id_328":"Alert Reward",
  "GainExperience_experience_id_322":"Tank Hunter Bonus - Prowler Kill",
  "GainExperience_experience_id_330":"Tank Hunter Bonus - Magrider Kil",
  "GainExperience_experience_id_331":"Dogfighter Bonus - Mosquito Kill",
  "GainExperience_experience_id_332":"Dogfighter Bonus - Reaver Kill",
  "GainExperience_experience_id_333":"Dogfighter Bonus - Scythe Kill",
  "GainExperience_experience_id_334":"Tank Hunter Bonus - Vanguard Kil",
  "GainExperience_experience_id_335":"Savior Kill (Non MAX)",
  "GainExperience_experience_id_336":"Saved",
  "GainExperience_experience_id_337":"Holiday Event NPC: Kill",
  "GainExperience_experience_id_338":"Holiday Event NPC Gold: Kill",
  "GainExperience_experience_id_339":"Snowman Kill by Sunderer Gunner",
  "GainExperience_experience_id_340":"Snowman Kill by Magrider Gunner",
  "GainExperience_experience_id_341":"Snowman Kill by Vanguard Gunner",
  "GainExperience_experience_id_342":"Snowman Kill by Prowler Gunner",
  "GainExperience_experience_id_343":"Snowman Kill by Liberator Gunner",
  "GainExperience_experience_id_344":"Snowman Kill by Galaxy Gunner",
  "GainExperience_experience_id_345":"Snowman Kill by Harasser Gunner",
  "GainExperience_experience_id_346":"GSnowman Kill by Sunder Gunner",
  "GainExperience_experience_id_347":"GSnowman Kill by Mag Gunner",
  "GainExperience_experience_id_348":"GSnowman Kill by Vang Gunner",
  "GainExperience_experience_id_349":"GSnowman Kill by Prow Gunner",
  "GainExperience_experience_id_350":"GSnowman Kill by Lib Gunner",
  "GainExperience_experience_id_351":"GSnowman Kill by Gal Gunner",
  "GainExperience_experience_id_352":"GSnowman Kill by Haras Gunner",
  "GainExperience_experience_id_353":"Scout Radar Detect",
  "GainExperience_experience_id_354":"Squad Scout Radar Detect",
  "GainExperience_experience_id_355":"Squad Vehicle Spawn Bonus",
  "GainExperience_experience_id_356":"Vehicle Ram Kill - R Drone",
  "GainExperience_experience_id_357":"Vehicle Destruction - R Drone",
  "GainExperience_experience_id_358":"Squad Repair - R Drone",
  "GainExperience_experience_id_359":"Vehicle Repair - R Drone",
  "GainExperience_experience_id_360":"Kill Assist - R Drone",
  "GainExperience_experience_id_362":"R Drone Kill by Harasser Gunner",
  "GainExperience_experience_id_363":"R Drone Kill by Sunderer Gunner",
  "GainExperience_experience_id_364":"R Drone Kill by Magrider Gunner",
  "GainExperience_experience_id_365":"R Drone Kill by Prowler Gunner",
  "GainExperience_experience_id_366":"R Drone Kill by Lib Gunner",
  "GainExperience_experience_id_367":"R Drone Kill by Galaxy Gunner",
  "GainExperience_experience_id_368":"Spot Kill - R Drone",
  "GainExperience_experience_id_369":"Squad Spot Kill - R Drone",
  "GainExperience_experience_id_370":"Motion Sensor Spotter Kill",
  "GainExperience_experience_id_371":"Kill Player Priority Assist",
  "GainExperience_experience_id_372":"Kill Player High Priority Assist",
  "GainExperience_experience_id_437":"Shield Regen Tool Kill",
  "GainExperience_experience_id_438":"Shield Repair",
  "GainExperience_experience_id_439":"Squad Shield Repair",
  "GainExperience_experience_id_440":"Chain Expl Assist: Infantry",
  "GainExperience_experience_id_441":"Chain Expl Assist: Flash",
  "GainExperience_experience_id_501":"Vehicle Destruction - Valkyrie",
  "GainExperience_experience_id_502":"Vehicle Ram Kill - Valkyrie",
  "GainExperience_experience_id_503":"Vehicle Repair - Valkyrie",
  "GainExperience_experience_id_504":"Kill Assist - Valkyrie",
  "GainExperience_experience_id_505":"Squad Repair - Valkyrie",
  "GainExperience_experience_id_506":"Spot Kill - Valkyrie",
  "GainExperience_experience_id_507":"Squad Spot Kill - Valkyrie",
  "GainExperience_experience_id_508":"Valkyrie Damage",
  "GainExperience_experience_id_509":"Valkyrie Kill by Sunderer Gunner",
  "GainExperience_experience_id_510":"Valkyrie Kill by Magrider Gunner",
  "GainExperience_experience_id_511":"Valkyrie Kill by Vanguard Gunner",
  "GainExperience_experience_id_512":"Valkyrie Kill by Prowler Gunner",
  "GainExperience_experience_id_513":"Valkyrie Kill by Liberator Gunner",
  "GainExperience_experience_id_514":"Valkyrie Kill by Galaxy Gunner",
  "GainExperience_experience_id_515":"Player Kill by Valkyrie Gunner",
  "GainExperience_experience_id_520":"Flash Kill by Valkyrie Gunner",
  "GainExperience_experience_id_521":"Sunderer Kill by Valkyrie Gunner",
  "GainExperience_experience_id_522":"Lightning Kill by Valkyrie Gunne",
  "GainExperience_experience_id_523":"Vanguard Kill by Valkyrie Gunner",
  "GainExperience_experience_id_524":"Prowler Kill by Valkyrie Gunner",
  "GainExperience_experience_id_525":"Reaver Kill by Valkyrie Gunner",
  "GainExperience_experience_id_526":"Mosquito Kill by Valkyrie Gunner",
  "GainExperience_experience_id_527":"Lib Kill by Valkyrie",
  "GainExperience_experience_id_528":"Galaxy Kill by Valkyrie Gunner",
  "GainExperience_experience_id_529":"Magrider Kill by Valkyrie Gunner",
  "GainExperience_experience_id_530":"Scythe Kill by Valkyrie Gunner",
  "GainExperience_experience_id_531":"Snowman Kill by Valkyrie Gunner",
  "GainExperience_experience_id_532":"R Drone Kill by Valkyrie Gunner",
  "GainExperience_experience_id_533":"Valkyrie Kill by Valkyrie Gunner",
  "GainExperience_experience_id_534":"Chain Expl Assist: Phalanx",
  "GainExperience_experience_id_535":"Chain Expl Assist: Drop Pod",
  "GainExperience_experience_id_536":"Chain Expl Assist: Galaxy",
  "GainExperience_experience_id_537":"Chain Expl Assist: Liberator",
  "GainExperience_experience_id_538":"Chain Expl Assist: Lightning",
  "GainExperience_experience_id_539":"Chain Expl Assist: Magrider",
  "GainExperience_experience_id_540":"Chain Expl Assist: Mosquito",
  "GainExperience_experience_id_541":"Chain Expl Assist: Prowler",
  "GainExperience_experience_id_542":"Chain Expl Assist: Reaver",
  "GainExperience_experience_id_543":"Chain Expl Assist: Scythe",
  "GainExperience_experience_id_544":"Chain Expl Assist: Sunderer",
  "GainExperience_experience_id_545":"Chain Expl Assist: Vanguard",
  "GainExperience_experience_id_546":"Chain Expl Assist: Harasser",
  "GainExperience_experience_id_547":"Chain Expl Assist: R Drone",
  "GainExperience_experience_id_548":"Chain Expl Assist: Valkyrie",
  "GainExperience_experience_id_550":"Concussion Grenade Assist",
  "GainExperience_experience_id_551":"Concussion Grenade Squad Assist",
  "GainExperience_experience_id_552":"EMP Grenade Assist",
  "GainExperience_experience_id_553":"EMP Grenade Squad Assist",
  "GainExperience_experience_id_554":"Flashbang Assist",
  "GainExperience_experience_id_555":"Flashbang Squad Assist",
  "GainExperience_experience_id_556":"Objective Pulse Defend",
  "GainExperience_experience_id_557":"Objective Pulse Capture",
  "GainExperience_experience_id_558":"Halloween Event NPC GreatP: Kill",
  "GainExperience_experience_id_559":"Pumpkin Kill by Valkyrie Gunner",
  "GainExperience_experience_id_560":"Pumpkin Kill by Sunderer Gunner",
  "GainExperience_experience_id_561":"Pumpkin Kill by Magrider Gunner",
  "GainExperience_experience_id_562":"Pumpkin Kill by Vanguard Gunner",
  "GainExperience_experience_id_563":"Pumpkin Kill by Prowler Gunner",
  "GainExperience_experience_id_564":"Pumpkin Kill by Liberator Gunner",
  "GainExperience_experience_id_565":"Pumpkin Kill by Galaxy Gunner",
  "GainExperience_experience_id_566":"Pumpkin Kill by Harasser Gunner",
  "GainExperience_experience_id_567":"GPumpkin Kill by Sunder Gunner",
  "GainExperience_experience_id_568":"GPumpkin Kill by Mag Gunner",
  "GainExperience_experience_id_569":"GPumpkin Kill by Vang Gunner",
  "GainExperience_experience_id_570":"GPumpkin Kill by Prow Gunner",
  "GainExperience_experience_id_571":"GPumpkin Kill by Lib Gunner",
  "GainExperience_experience_id_572":"GPumpkin Kill by Gal Gunner",
  "GainExperience_experience_id_573":"GPumpkin Kill by Haras Gunner",
  "GainExperience_experience_id_574":"Halloween Event NPC: Kill",
  "GainExperience_experience_id_575":"Harasser Kill by Valkyrie Gunner",
  "GainExperience_experience_id_576":"Valkyrie Kill by Harasser Gunner",
  "GainExperience_experience_id_577":"Snowman kill by squad member",
  "GainExperience_experience_id_578":"Gsnowman kill by squad member",
  "GainExperience_experience_id_579":"Destroy Spitfire Turret",
  "GainExperience_experience_id_580":"Vehicle Ram Kill - Spitfire Turret",
  "GainExperience_experience_id_581":"Vehicle Repair - Spitfire Turret",
  "GainExperience_experience_id_582":"Kill Assist - Spitfire Turret",
  "GainExperience_experience_id_584":"Squad Repair - Spitfire Turret",
  "GainExperience_experience_id_585":"Spot Kill - Spitfire Turret",
  "GainExperience_experience_id_586":"Squad Spot Kill - Spitfire Turret",
  "GainExperience_experience_id_591":"Kill Dummy NPC",
  "GainExperience_experience_id_592":"Savior Kill (MAX)",
  "GainExperience_experience_id_593":"Bounty Kill Bonus",
  "GainExperience_experience_id_594":"Bounty Kill Cashed In",
  "GainExperience_experience_id_595":"Bounty Kill Streak",
  "GainExperience_experience_id_596":"Membership bonus xp",
  "GainExperience_experience_id_597":"Victory Point XP",
  "GainExperience_experience_id_598":"Continent Capture XP",
  "GainExperience_experience_id_599":"Victory Point XP (-25%XP)",
  "GainExperience_experience_id_600":"Victory Point XP (-50%XP)",
  "GainExperience_experience_id_601":"Victory Point XP (-75%XP)",
  "GainExperience_experience_id_602":"Victory Point XP (+50%XP)",
  "GainExperience_experience_id_603":"Vehicle Ram Kill - Construction - Med",
  "GainExperience_experience_id_604":"Kill/Destroy - Construction - Med",
  "GainExperience_experience_id_605":"SquadRepair - Construction - Med",
  "GainExperience_experience_id_606":"Repair - Construction - Med",
  "GainExperience_experience_id_607":"KillAssist - Construction - Med",
  "GainExperience_experience_id_609":"Spot Kill - Construction - Med ",
  "GainExperience_experience_id_610":"Squad Spot Kill - Construction - Med",
  "GainExperience_experience_id_615":"Vehicle Ram Kill - Construction - Small",
  "GainExperience_experience_id_616":"Kill/Destroy - Construction - Small",
  "GainExperience_experience_id_617":"SquadRepair - Construction - Sma",
  "GainExperience_experience_id_618":"Repair - Construction - Small",
  "GainExperience_experience_id_619":"KillAssist - Construction - Small",
  "GainExperience_experience_id_621":"Spot Kill - Construction - Small ",
  "GainExperience_experience_id_622":"Squad Spot Kill - Construction - Small",
  "GainExperience_experience_id_627":"Vehicle Ram Kill - Construction - Large",
  "GainExperience_experience_id_628":"Kill/Destroy - Construction - Large",
  "GainExperience_experience_id_629":"SquadRepair - Construction - Lar",
  "GainExperience_experience_id_630":"Repair - Construction - Large",
  "GainExperience_experience_id_631":"KillAssist - Construction - Large",
  "GainExperience_experience_id_633":"Spot Kill - Construction - Large ",
  "GainExperience_experience_id_634":"Squad Spot Kill - Construction - Large",
  "GainExperience_experience_id_639":"Vehicle Ram Kill - Construction - Core",
  "GainExperience_experience_id_640":"Kill/Destroy - Construction - Core",
  "GainExperience_experience_id_641":"SquadRepair - Construction - Cor",
  "GainExperience_experience_id_642":"Repair - Construction - Core",
  "GainExperience_experience_id_643":"KillAssist - Construction - Core",
  "GainExperience_experience_id_645":"Spot Kill - Construction - Core ",
  "GainExperience_experience_id_646":"Squad Spot Kill - Construction - Core",
  "GainExperience_experience_id_651":"Vehicle Destruction - ANT",
  "GainExperience_experience_id_652":"Vehicle Ram Kill - ANT",
  "GainExperience_experience_id_653":"Vehicle Repair - ANT",
  "GainExperience_experience_id_654":"Kill Assist - ANT",
  "GainExperience_experience_id_656":"Squad Repair - ANT",
  "GainExperience_experience_id_657":"ANT Kill by ANT Gunner",
  "GainExperience_experience_id_658":"ANT Kill by Magrider Gunner",
  "GainExperience_experience_id_659":"ANT Kill by Vanguard Gunner",
  "GainExperience_experience_id_660":"ANT Kill by Prowler Gunner",
  "GainExperience_experience_id_661":"ANT Kill by Lib Gunner",
  "GainExperience_experience_id_662":"ANT Kill by Galaxy Gunner",
  "GainExperience_experience_id_663":"Spot Kill - ANT",
  "GainExperience_experience_id_664":"Squad Spot Kill - ANT",
  "GainExperience_experience_id_665":"ANT Damage (Infantry vs Vehicle)",
  "GainExperience_experience_id_666":"ANT Kill by Harasser Gunner",
  "GainExperience_experience_id_671":"ANT Kill by Valkyrie Gunner",
  "GainExperience_experience_id_672":"Chain Expl Assist: ANT",
  "GainExperience_experience_id_673":"Bounty Kill Cashed In",
  "GainExperience_experience_id_674":"Cortium Harvest",
  "GainExperience_experience_id_675":"Cortium Deposit",
  "GainExperience_experience_id_676":"Flash Kill by ANT Gunner",
  "GainExperience_experience_id_677":"Galaxy Kill by ANT Gunner",
  "GainExperience_experience_id_678":"Harasser Kill by ANT Gunner",
  "GainExperience_experience_id_679":"Magrider Kill by ANT Gunner",
  "GainExperience_experience_id_680":"Mosquito Kill by ANT Gunner",
  "GainExperience_experience_id_681":"Player Kill by ANT Gunner",
  "GainExperience_experience_id_682":"Prowler Kill by ANT Gunner",
  "GainExperience_experience_id_683":"Pumpkin Kill by ANT Gunner",
  "GainExperience_experience_id_684":"R Drone Kill by ANT Gunner",
  "GainExperience_experience_id_685":"Reaver Kill by ANT Gunner",
  "GainExperience_experience_id_686":"Scythe Kill by ANT Gunner",
  "GainExperience_experience_id_687":"Snowman Kill by ANT Gunner",
  "GainExperience_experience_id_688":"Sunderer Kill by ANT Gunner",
  "GainExperience_experience_id_689":"Valkyrie Kill by ANT Gunner",
  "GainExperience_experience_id_690":"Vanguard Kill by ANT Gunner",
  "GainExperience_experience_id_693":"Kill Player - HIVE XP (Source)",
  "GainExperience_experience_id_694":"Kill Player - HIVE XP (Target)",
  "GainExperience_experience_id_695":"Kill Player Assist HIVE: Source",
  "GainExperience_experience_id_696":"Kill Spawn Ass HIVE: Source",
  "GainExperience_experience_id_697":"Heal Player HIVE: Source",
  "GainExperience_experience_id_698":"MAX Repair HIVE: Source",
  "GainExperience_experience_id_699":"Revive HIVE: Source",
  "GainExperience_experience_id_701":"Destroy SecObj HIVE: Source",
  "GainExperience_experience_id_702":"Destroy SecAss HIVE: Source",
  "GainExperience_experience_id_703":"Vehicle Dest: Flash HIVE: Source",
  "GainExperience_experience_id_705":"Transport Assist HIVE: Source",
  "GainExperience_experience_id_706":"Vehicle Repair - Flash HIVE: Source",
  "GainExperience_experience_id_707":"Resupply Player HIVE: Source",
  "GainExperience_experience_id_708":"Kill Player Assist HIVE XP (Target)",
  "GainExperience_experience_id_709":"Kill Spawn Ass HIVE XP (Target)",
  "GainExperience_experience_id_710":"Heal Player HIVE XP (Target)",
  "GainExperience_experience_id_711":"MAX Repair HIVE XP (Target)",
  "GainExperience_experience_id_712":"Revive HIVE XP (Target)",
  "GainExperience_experience_id_714":"Destroy SecObj HIVE XP (Target)",
  "GainExperience_experience_id_715":"Destroy SecAss HIVE XP (Target)",
  "GainExperience_experience_id_716":"Vehicle Dest: Flash HIVE XP (Target)",
  "GainExperience_experience_id_718":"Transport Assist HIVE XP (Target)",
  "GainExperience_experience_id_719":"Vehicle Repair - Flash HIVE XP (Target)",
  "GainExperience_experience_id_720":"Resupply Player HIVE XP (Target)",
  "GainExperience_experience_id_721":"Destroy Engineer Turret HIVE XP (Source)",
  "GainExperience_experience_id_722":"Vehicle Destruction - Phalanx HIVE XP (Source)",
  "GainExperience_experience_id_723":"Vehicle Destruction - Drop Pod HIVE XP (Source)",
  "GainExperience_experience_id_724":"Vehicle Destruction - Galaxy HIVE XP (Source)",
  "GainExperience_experience_id_725":"Vehicle Destruction - Liberator HIVE XP (Source)",
  "GainExperience_experience_id_726":"Vehicle Destruction - Lightning HIVE XP (Source)",
  "GainExperience_experience_id_727":"Vehicle Destruction - Magrider HIVE XP (Source)",
  "GainExperience_experience_id_728":"Vehicle Destruction - Mosquito HIVE XP (Source)",
  "GainExperience_experience_id_729":"Vehicle Destruction - Prowler HIVE XP (Source)",
  "GainExperience_experience_id_730":"Vehicle Destruction - Reaver HIVE XP (Source)",
  "GainExperience_experience_id_731":"Vehicle Destruction - Scythe HIVE XP (Source)",
  "GainExperience_experience_id_732":"Vehicle Destruction - Sunderer HIVE XP (Source)",
  "GainExperience_experience_id_733":"Vehicle Destruction - Vanguard HIVE XP (Source)",
  "GainExperience_experience_id_734":"Vehicle Repair - Engi Turret HIVE XP (Source)",
  "GainExperience_experience_id_735":"Vehicle Repair - Phalanx HIVE XP (Source)",
  "GainExperience_experience_id_736":"Vehicle Repair - Drop Pod HIVE XP (Source)",
  "GainExperience_experience_id_737":"Vehicle Repair - Galaxy HIVE XP (Source)",
  "GainExperience_experience_id_738":"Vehicle Repair - Liberator HIVE XP (Source)",
  "GainExperience_experience_id_739":"Vehicle Repair - Lightning HIVE XP (Source)",
  "GainExperience_experience_id_740":"Vehicle Repair - Magrider HIVE XP (Source)",
  "GainExperience_experience_id_741":"Destroy Engineer Turret HIVE XP (Target)",
  "GainExperience_experience_id_742":"Vehicle Destruction - Phalanx HIVE XP (Target)",
  "GainExperience_experience_id_743":"Vehicle Destruction - Drop Pod HIVE XP (Target)",
  "GainExperience_experience_id_744":"Vehicle Destruction - Galaxy HIVE XP (Target)",
  "GainExperience_experience_id_745":"Vehicle Destruction - Liberator HIVE XP (Target)",
  "GainExperience_experience_id_746":"Vehicle Destruction - Lightning HIVE XP (Target)",
  "GainExperience_experience_id_747":"Vehicle Destruction - Magrider HIVE XP (Target)",
  "GainExperience_experience_id_748":"Vehicle Destruction - Mosquito HIVE XP (Target)",
  "GainExperience_experience_id_749":"Vehicle Destruction - Prowler HIVE XP (Target)",
  "GainExperience_experience_id_750":"Vehicle Destruction - Reaver HIVE XP (Target)",
  "GainExperience_experience_id_751":"Vehicle Destruction - Scythe HIVE XP (Target)",
  "GainExperience_experience_id_752":"Vehicle Destruction - Sunderer HIVE XP (Target)",
  "GainExperience_experience_id_753":"Vehicle Destruction - Vanguard HIVE XP (Target)",
  "GainExperience_experience_id_754":"Vehicle Repair - Engi Turret HIVE XP (Target)",
  "GainExperience_experience_id_755":"Vehicle Repair - Phalanx HIVE XP (Target)",
  "GainExperience_experience_id_756":"Vehicle Repair - Drop Pod HIVE XP (Target)",
  "GainExperience_experience_id_757":"Vehicle Repair - Galaxy HIVE XP (Target)",
  "GainExperience_experience_id_758":"Vehicle Repair - Liberator HIVE XP (Target)",
  "GainExperience_experience_id_759":"Vehicle Repair - Lightning HIVE XP (Target)",
  "GainExperience_experience_id_760":"Vehicle Repair - Magrider HIVE XP (Target)",
  "GainExperience_experience_id_761":"Vehicle Repair - Mosquito HIVE XP (Source)",
  "GainExperience_experience_id_762":"Vehicle Repair - Prowler HIVE XP (Source)",
  "GainExperience_experience_id_763":"Vehicle Repair - Reaver HIVE XP (Source)",
  "GainExperience_experience_id_764":"Vehicle Repair - Scythe HIVE XP (Source)",
  "GainExperience_experience_id_765":"Vehicle Repair - Sunderer HIVE XP (Source)",
  "GainExperience_experience_id_766":"Vehicle Repair - Vanguard HIVE XP (Source)",
  "GainExperience_experience_id_767":"Kill Assist - Flash HIVE XP (Source)",
  "GainExperience_experience_id_768":"Kill Assist - Engi Turret HIVE XP (Source)",
  "GainExperience_experience_id_769":"Kill Assist - Phalanx HIVE XP (Source)",
  "GainExperience_experience_id_770":"Kill Assist - Drop Pod HIVE XP (Source)",
  "GainExperience_experience_id_771":"Kill Assist - Galaxy HIVE XP (Source)",
  "GainExperience_experience_id_772":"Kill Assist - Liberator HIVE XP (Source)",
  "GainExperience_experience_id_773":"Kill Assist - Lightning HIVE XP (Source)",
  "GainExperience_experience_id_774":"Kill Assist - Magrider HIVE XP (Source)",
  "GainExperience_experience_id_775":"Kill Assist - Mosquito HIVE XP (Source)",
  "GainExperience_experience_id_776":"Kill Assist - Prowler HIVE XP (Source)",
  "GainExperience_experience_id_777":"Kill Assist - Reaver HIVE XP (Source)",
  "GainExperience_experience_id_778":"Kill Assist - Scythe HIVE XP (Source)",
  "GainExperience_experience_id_779":"Kill Assist - Sunderer HIVE XP (Source)",
  "GainExperience_experience_id_780":"Kill Assist - Vanguard HIVE XP (Source)",
  "GainExperience_experience_id_781":"Vehicle Repair - Mosquito HIVE XP (Target)",
  "GainExperience_experience_id_782":"Vehicle Repair - Prowler HIVE XP (Target)",
  "GainExperience_experience_id_783":"Vehicle Repair - Reaver HIVE XP (Target)",
  "GainExperience_experience_id_784":"Vehicle Repair - Scythe HIVE XP (Target)",
  "GainExperience_experience_id_785":"Vehicle Repair - Sunderer HIVE XP (Target)",
  "GainExperience_experience_id_786":"Vehicle Repair - Vanguard HIVE XP (Target)",
  "GainExperience_experience_id_787":"Kill Assist - Flash HIVE XP (Target)",
  "GainExperience_experience_id_788":"Kill Assist - Engi Turret HIVE XP (Target)",
  "GainExperience_experience_id_789":"Kill Assist - Phalanx HIVE XP (Target)",
  "GainExperience_experience_id_790":"Kill Assist - Drop Pod HIVE XP (Target)",
  "GainExperience_experience_id_791":"Kill Assist - Galaxy HIVE XP (Target)",
  "GainExperience_experience_id_792":"Kill Assist - Liberator HIVE XP (Target)",
  "GainExperience_experience_id_793":"Kill Assist - Lightning HIVE XP (Target)",
  "GainExperience_experience_id_794":"Kill Assist - Magrider HIVE XP (Target)",
  "GainExperience_experience_id_795":"Kill Assist - Mosquito HIVE XP (Target)",
  "GainExperience_experience_id_796":"Kill Assist - Prowler HIVE XP (Target)",
  "GainExperience_experience_id_797":"Kill Assist - Reaver HIVE XP (Target)",
  "GainExperience_experience_id_798":"Kill Assist - Scythe HIVE XP (Target)",
  "GainExperience_experience_id_799":"Kill Assist - Sunderer HIVE XP (Target)",
  "GainExperience_experience_id_800":"Kill Assist - Vanguard HIVE XP (Target)",
  "GainExperience_experience_id_815":"Drop Pod Kill HIVE XP (Source)",
  "GainExperience_experience_id_816":"Player Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_817":"Player Kill by Magrider Gunner HIVE XP (Source)",
  "GainExperience_experience_id_818":"Player Kill by Vanguard Gunner HIVE XP (Source)",
  "GainExperience_experience_id_819":"Player Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_820":"Player Kill by Liberator Gunner HIVE XP (Source)",
  "GainExperience_experience_id_835":"Drop Pod Kill HIVE XP (Target)",
  "GainExperience_experience_id_836":"Player Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_837":"Player Kill by Magrider Gunner HIVE XP (Target)",
  "GainExperience_experience_id_838":"Player Kill by Vanguard Gunner HIVE XP (Target)",
  "GainExperience_experience_id_839":"Player Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_840":"Player Kill by Liberator Gunner HIVE XP (Target)",
  "GainExperience_experience_id_841":"Player Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_842":"Flash Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_843":"Sunderer Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_844":"Lightning Kill by Sunderer Gunne HIVE XP (Source)",
  "GainExperience_experience_id_845":"Magrider Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_846":"Vanguard Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_847":"Prowler Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_848":"Scythe Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_849":"Reaver Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_850":"Mosquito Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_851":"Lib Kill by Sunderer HIVE XP (Source)",
  "GainExperience_experience_id_852":"Galaxy Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_853":"Flash Kill by Magrider Gunner HIVE XP (Source)",
  "GainExperience_experience_id_854":"Sunderer Kill by Magrider Gunner HIVE XP (Source)",
  "GainExperience_experience_id_855":"Lightning Kill by Magrider Gunne HIVE XP (Source)",
  "GainExperience_experience_id_856":"Vanguard Kill by Magrider Gunner HIVE XP (Source)",
  "GainExperience_experience_id_857":"Prowler Kill by Magrider Gunner HIVE XP (Source)",
  "GainExperience_experience_id_858":"Reaver Kill by Magrider Gunner HIVE XP (Source)",
  "GainExperience_experience_id_859":"Mosquito Kill by Magrider Gunner HIVE XP (Source)",
  "GainExperience_experience_id_860":"Lib Kill by Magrider HIVE XP (Source)",
  "GainExperience_experience_id_861":"Player Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_862":"Flash Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_863":"Sunderer Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_864":"Lightning Kill by Sunderer Gunne HIVE XP (Target)",
  "GainExperience_experience_id_865":"Magrider Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_866":"Vanguard Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_867":"Prowler Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_868":"Scythe Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_869":"Reaver Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_870":"Mosquito Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_871":"Lib Kill by Sunderer HIVE XP (Target)",
  "GainExperience_experience_id_872":"Galaxy Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_873":"Flash Kill by Magrider Gunner HIVE XP (Target)",
  "GainExperience_experience_id_874":"Sunderer Kill by Magrider Gunner HIVE XP (Target)",
  "GainExperience_experience_id_875":"Lightning Kill by Magrider Gunne HIVE XP (Target)",
  "GainExperience_experience_id_876":"Vanguard Kill by Magrider Gunner HIVE XP (Target)",
  "GainExperience_experience_id_877":"Prowler Kill by Magrider Gunner HIVE XP (Target)",
  "GainExperience_experience_id_878":"Reaver Kill by Magrider Gunner HIVE XP (Target)",
  "GainExperience_experience_id_879":"Mosquito Kill by Magrider Gunner HIVE XP (Target)",
  "GainExperience_experience_id_880":"Lib Kill by Magrider HIVE XP (Target)",
  "GainExperience_experience_id_881":"Galaxy Kill by Magrider Gunner HIVE XP (Source)",
  "GainExperience_experience_id_882":"Flash Kill by Vanguard Gunner HIVE XP (Source)",
  "GainExperience_experience_id_883":"Sunderer Kill by Vanguard Gunner HIVE XP (Source)",
  "GainExperience_experience_id_884":"Lightning Kill by Vanguard Gunne HIVE XP (Source)",
  "GainExperience_experience_id_885":"Magrider Kill by Vanguard Gunner HIVE XP (Source)",
  "GainExperience_experience_id_886":"Prowler Kill by Vanguard Gunner HIVE XP (Source)",
  "GainExperience_experience_id_887":"Scythe Kill by Vanguard Gunner HIVE XP (Source)",
  "GainExperience_experience_id_888":"Mosquito Kill by Vanguard Gunner HIVE XP (Source)",
  "GainExperience_experience_id_889":"Lib Kill by Vanguard HIVE XP (Source)",
  "GainExperience_experience_id_890":"Galaxy Kill by Vanguard Gunner HIVE XP (Source)",
  "GainExperience_experience_id_891":"Flash Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_892":"Sunderer Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_893":"Lightning Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_894":"Magrider Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_895":"Vanguard Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_896":"Scythe Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_897":"Reaver Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_898":"Liberator Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_899":"Galaxy Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_900":"Galaxy Kill by Magrider Gunner HIVE XP (Target)",
  "GainExperience_experience_id_901":"Flash Kill by Vanguard Gunner HIVE XP (Target)",
  "GainExperience_experience_id_902":"Sunderer Kill by Vanguard Gunner HIVE XP (Target)",
  "GainExperience_experience_id_903":"Lightning Kill by Vanguard Gunne HIVE XP (Target)",
  "GainExperience_experience_id_904":"Magrider Kill by Vanguard Gunner HIVE XP (Target)",
  "GainExperience_experience_id_905":"Prowler Kill by Vanguard Gunner HIVE XP (Target)",
  "GainExperience_experience_id_906":"Scythe Kill by Vanguard Gunner HIVE XP (Target)",
  "GainExperience_experience_id_907":"Mosquito Kill by Vanguard Gunner HIVE XP (Target)",
  "GainExperience_experience_id_908":"Lib Kill by Vanguard HIVE XP (Target)",
  "GainExperience_experience_id_909":"Galaxy Kill by Vanguard Gunner HIVE XP (Target)",
  "GainExperience_experience_id_910":"Flash Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_911":"Sunderer Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_912":"Lightning Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_913":"Magrider Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_914":"Vanguard Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_915":"Scythe Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_916":"Reaver Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_917":"Liberator Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_918":"Galaxy Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_919":"Flash Kill by Liberator Gunner HIVE XP (Source)",
  "GainExperience_experience_id_920":"Sunderer Kill by Lib Gunner HIVE XP (Source)",
  "GainExperience_experience_id_921":"Lightning Kill by Liberator Gunn HIVE XP (Source)",
  "GainExperience_experience_id_922":"Magrider Kill by Lib Gunner HIVE XP (Source)",
  "GainExperience_experience_id_923":"Vanguard Kill by Lib Gunner HIVE XP (Source)",
  "GainExperience_experience_id_924":"Prowler Kill by Liberator Gunner HIVE XP (Source)",
  "GainExperience_experience_id_925":"Scythe Kill by Liberator Gunner HIVE XP (Source)",
  "GainExperience_experience_id_926":"Reaver Kill by Liberator Gunner HIVE XP (Source)",
  "GainExperience_experience_id_927":"Mosquito Kill by Lib Gunner HIVE XP (Source)",
  "GainExperience_experience_id_928":"Lib Kill by Liberator HIVE XP (Source)",
  "GainExperience_experience_id_929":"Galaxy Kill by Liberator Gunner HIVE XP (Source)",
  "GainExperience_experience_id_930":"Flash Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_931":"Sunderer Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_932":"Lightning Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_933":"Magrider Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_934":"Vanguard Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_935":"Prowler Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_936":"Scythe Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_937":"Reaver Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_938":"Mosquito Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_939":"Flash Kill by Liberator Gunner HIVE XP (Target)",
  "GainExperience_experience_id_940":"Sunderer Kill by Lib Gunner HIVE XP (Target)",
  "GainExperience_experience_id_941":"Lightning Kill by Liberator Gunn HIVE XP (Target)",
  "GainExperience_experience_id_942":"Magrider Kill by Lib Gunner HIVE XP (Target)",
  "GainExperience_experience_id_943":"Vanguard Kill by Lib Gunner HIVE XP (Target)",
  "GainExperience_experience_id_944":"Prowler Kill by Liberator Gunner HIVE XP (Target)",
  "GainExperience_experience_id_945":"Scythe Kill by Liberator Gunner HIVE XP (Target)",
  "GainExperience_experience_id_946":"Reaver Kill by Liberator Gunner HIVE XP (Target)",
  "GainExperience_experience_id_947":"Mosquito Kill by Lib Gunner HIVE XP (Target)",
  "GainExperience_experience_id_948":"Lib Kill by Liberator HIVE XP (Target)",
  "GainExperience_experience_id_949":"Galaxy Kill by Liberator Gunner HIVE XP (Target)",
  "GainExperience_experience_id_950":"Flash Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_951":"Sunderer Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_952":"Lightning Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_953":"Magrider Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_954":"Vanguard Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_955":"Prowler Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_956":"Scythe Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_957":"Reaver Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_958":"Mosquito Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_959":"LibKill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_960":"Galaxy Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_961":"Terminal Kill HIVE XP (Source)",
  "GainExperience_experience_id_962":"Terminal Repair HIVE XP (Source)",
  "GainExperience_experience_id_966":"Galaxy Damage HIVE XP (Source)",
  "GainExperience_experience_id_967":"Liberator Damage HIVE XP (Source)",
  "GainExperience_experience_id_969":"Mosquito Damage HIVE XP (Source)",
  "GainExperience_experience_id_970":"Reaver Damage HIVE XP (Source)",
  "GainExperience_experience_id_971":"Scythe Damage HIVE XP (Source)",
  "GainExperience_experience_id_974":"Vehicle Repair - Harasser HIVE XP (Source)",
  "GainExperience_experience_id_975":"Kill Assist - Harasser HIVE XP (Source)",
  "GainExperience_experience_id_977":"Spot Kill - Harasser HIVE XP (Source)",
  "GainExperience_experience_id_978":"LibKill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_979":"Galaxy Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_980":"Terminal Kill HIVE XP (Target)",
  "GainExperience_experience_id_981":"Terminal Repair HIVE XP (Target)",
  "GainExperience_experience_id_985":"Galaxy Damage HIVE XP (Target)",
  "GainExperience_experience_id_986":"Liberator Damage HIVE XP (Target)",
  "GainExperience_experience_id_988":"Mosquito Damage HIVE XP (Target)",
  "GainExperience_experience_id_989":"Reaver Damage HIVE XP (Target)",
  "GainExperience_experience_id_990":"Scythe Damage HIVE XP (Target)",
  "GainExperience_experience_id_993":"Vehicle Repair - Harasser HIVE XP (Target)",
  "GainExperience_experience_id_994":"Kill Assist - Harasser HIVE XP (Target)",
  "GainExperience_experience_id_996":"Spot Kill - Harasser HIVE XP (Target)",
  "GainExperience_experience_id_997":"Harasser Kill by Sunderer Gunne HIVE XP (Source)",
  "GainExperience_experience_id_998":"Harasser Kill by Magrider Gunne HIVE XP (Source)",
  "GainExperience_experience_id_999":"Harasser Kill by Vanguard Gunne HIVE XP (Source)",
  "GainExperience_experience_id_1000":"Harasser Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1001":"Harasser Kill by Liberator Gunn HIVE XP (Source)",
  "GainExperience_experience_id_1002":"Harasser Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1003":"Player Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1004":"Flash Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1005":"Sunderer Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1006":"Lightning Kill by Harasser Gunne HIVE XP (Source)",
  "GainExperience_experience_id_1007":"Vanguard Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1008":"Prowler Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1009":"Reaver Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1010":"Mosquito Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1011":"Lib Kill by Harasser HIVE XP (Source)",
  "GainExperience_experience_id_1012":"Galaxy Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1013":"Harasser Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1014":"Magrider Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1015":"Scythe Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1016":"Tank Mine Despawn/Defusal HIVE XP (Source)",
  "GainExperience_experience_id_1017":"Harasser Kill by Sunderer Gunne HIVE XP (Target)",
  "GainExperience_experience_id_1018":"Harasser Kill by Magrider Gunne HIVE XP (Target)",
  "GainExperience_experience_id_1019":"Harasser Kill by Vanguard Gunne HIVE XP (Target)",
  "GainExperience_experience_id_1020":"Harasser Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1021":"Harasser Kill by Liberator Gunn HIVE XP (Target)",
  "GainExperience_experience_id_1022":"Harasser Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1023":"Player Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1024":"Flash Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1025":"Sunderer Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1026":"Lightning Kill by Harasser Gunne HIVE XP (Target)",
  "GainExperience_experience_id_1027":"Vanguard Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1028":"Prowler Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1029":"Reaver Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1030":"Mosquito Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1031":"Lib Kill by Harasser HIVE XP (Target)",
  "GainExperience_experience_id_1032":"Galaxy Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1033":"Harasser Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1034":"Magrider Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1035":"Scythe Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1036":"Tank Mine Despawn/Defusal HIVE XP (Target)",
  "GainExperience_experience_id_1037":"Vehicle Gunner Kill Share - Infantry HIVE XP (Source)",
  "GainExperience_experience_id_1038":"Vehicle Gunner Kill Share - Flash HIVE XP (Source)",
  "GainExperience_experience_id_1039":"Vehicle Gunner Kill Share - Engineer Turret HIVE XP (Source)",
  "GainExperience_experience_id_1040":"Vehicle Gunner Kill Share - Phalanx HIVE XP (Source)",
  "GainExperience_experience_id_1041":"Vehicle Gunner Kill Share - Drop Pod HIVE XP (Source)",
  "GainExperience_experience_id_1042":"Vehicle Gunner Kill Share - Galaxy HIVE XP (Source)",
  "GainExperience_experience_id_1043":"Vehicle Gunner Kill Share - Liberator HIVE XP (Source)",
  "GainExperience_experience_id_1044":"Vehicle Gunner Kill Share - Lightning HIVE XP (Source)",
  "GainExperience_experience_id_1045":"Vehicle Gunner Kill Share - Magrider HIVE XP (Source)",
  "GainExperience_experience_id_1046":"Vehicle Gunner Kill Share - Mosquito HIVE XP (Source)",
  "GainExperience_experience_id_1047":"Vehicle Gunner Kill Share - Prowler HIVE XP (Source)",
  "GainExperience_experience_id_1048":"Vehicle Gunner Kill Share - Reaver HIVE XP (Source)",
  "GainExperience_experience_id_1049":"Vehicle Gunner Kill Share - Scythe HIVE XP (Source)",
  "GainExperience_experience_id_1050":"Vehicle Gunner Kill Share - Sunderer HIVE XP (Source)",
  "GainExperience_experience_id_1051":"Vehicle Gunner Kill Share - Vanguard HIVE XP (Source)",
  "GainExperience_experience_id_1052":"Vehicle Gunner Kill Share - Harasser HIVE XP (Source)",
  "GainExperience_experience_id_1053":"Vehicle Gunner Kill Assist Share - Infantry HIVE XP (Source)",
  "GainExperience_experience_id_1054":"Vehicle Gunner Kill Assist Share - Flash HIVE XP (Source)",
  "GainExperience_experience_id_1055":"Vehicle Gunner Kill Assist Share - Engi Turret HIVE XP (Source)",
  "GainExperience_experience_id_1056":"Vehicle Gunner Kill Assist Share - Phalanx HIVE XP (Source)",
  "GainExperience_experience_id_1057":"Vehicle Gunner Kill Share - Infantry HIVE XP (Target)",
  "GainExperience_experience_id_1058":"Vehicle Gunner Kill Share - Flash HIVE XP (Target)",
  "GainExperience_experience_id_1059":"Vehicle Gunner Kill Share - Engineer Turret HIVE XP (Target)",
  "GainExperience_experience_id_1060":"Vehicle Gunner Kill Share - Phalanx HIVE XP (Target)",
  "GainExperience_experience_id_1061":"Vehicle Gunner Kill Share - Drop Pod HIVE XP (Target)",
  "GainExperience_experience_id_1062":"Vehicle Gunner Kill Share - Galaxy HIVE XP (Target)",
  "GainExperience_experience_id_1063":"Vehicle Gunner Kill Share - Liberator HIVE XP (Target)",
  "GainExperience_experience_id_1064":"Vehicle Gunner Kill Share - Lightning HIVE XP (Target)",
  "GainExperience_experience_id_1065":"Vehicle Gunner Kill Share - Magrider HIVE XP (Target)",
  "GainExperience_experience_id_1066":"Vehicle Gunner Kill Share - Mosquito HIVE XP (Target)",
  "GainExperience_experience_id_1067":"Vehicle Gunner Kill Share - Prowler HIVE XP (Target)",
  "GainExperience_experience_id_1068":"Vehicle Gunner Kill Share - Reaver HIVE XP (Target)",
  "GainExperience_experience_id_1069":"Vehicle Gunner Kill Share - Scythe HIVE XP (Target)",
  "GainExperience_experience_id_1070":"Vehicle Gunner Kill Share - Sunderer HIVE XP (Target)",
  "GainExperience_experience_id_1071":"Vehicle Gunner Kill Share - Vanguard HIVE XP (Target)",
  "GainExperience_experience_id_1072":"Vehicle Gunner Kill Share - Harasser HIVE XP (Target)",
  "GainExperience_experience_id_1073":"Vehicle Gunner Kill Assist Share - Infantry HIVE XP (Target)",
  "GainExperience_experience_id_1074":"Vehicle Gunner Kill Assist Share - Flash HIVE XP (Target)",
  "GainExperience_experience_id_1075":"Vehicle Gunner Kill Assist Share - Engi Turret HIVE XP (Target)",
  "GainExperience_experience_id_1076":"Vehicle Gunner Kill Assist Share - Phalanx HIVE XP (Target)",
  "GainExperience_experience_id_1077":"Vehicle Gunner Kill Assist Share - Drop Pod HIVE XP (Source)",
  "GainExperience_experience_id_1078":"Vehicle Gunner Kill Assist Share - Galaxy HIVE XP (Source)",
  "GainExperience_experience_id_1079":"Vehicle Gunner Kill Assist Share - Liberator HIVE XP (Source)",
  "GainExperience_experience_id_1080":"Vehicle Gunner Kill Assist Share - Lightning HIVE XP (Source)",
  "GainExperience_experience_id_1081":"Vehicle Gunner Kill Assist Share - Magrider HIVE XP (Source)",
  "GainExperience_experience_id_1082":"Vehicle Gunner Kill Assist Share - Mosquito HIVE XP (Source)",
  "GainExperience_experience_id_1083":"Vehicle Gunner Kill Assist Share - Prowler HIVE XP (Source)",
  "GainExperience_experience_id_1084":"Vehicle Gunner Kill Assist Share - Reaver HIVE XP (Source)",
  "GainExperience_experience_id_1085":"Vehicle Gunner Kill Assist Share - Scythe HIVE XP (Source)",
  "GainExperience_experience_id_1086":"Vehicle Gunner Kill Assist Share - Sunderer HIVE XP (Source)",
  "GainExperience_experience_id_1087":"Vehicle Gunner Kill Assist Share - Vanguard HIVE XP (Source)",
  "GainExperience_experience_id_1088":"Vehicle Gunner Kill Assist Share - Harasser HIVE XP (Source)",
  "GainExperience_experience_id_1089":"Vehicle Passenger Kill Share - Infantry HIVE XP (Source)",
  "GainExperience_experience_id_1090":"Vehicle Passenger Kill Share - Flash HIVE XP (Source)",
  "GainExperience_experience_id_1091":"Vehicle Passenger Kill Share - Engineer Turret HIVE XP (Source)",
  "GainExperience_experience_id_1092":"Vehicle Passenger Kill Share - Phalanx HIVE XP (Source)",
  "GainExperience_experience_id_1093":"Vehicle Passenger Kill Share - Drop Pod HIVE XP (Source)",
  "GainExperience_experience_id_1094":"Vehicle Passenger Kill Share - Galaxy HIVE XP (Source)",
  "GainExperience_experience_id_1095":"Vehicle Passenger Kill Share - Liberator HIVE XP (Source)",
  "GainExperience_experience_id_1096":"Vehicle Passenger Kill Share - Lightning HIVE XP (Source)",
  "GainExperience_experience_id_1097":"Vehicle Gunner Kill Assist Share - Drop Pod HIVE XP (Target)",
  "GainExperience_experience_id_1098":"Vehicle Gunner Kill Assist Share - Galaxy HIVE XP (Target)",
  "GainExperience_experience_id_1099":"Vehicle Gunner Kill Assist Share - Liberator HIVE XP (Target)",
  "GainExperience_experience_id_1100":"Vehicle Gunner Kill Assist Share - Lightning HIVE XP (Target)",
  "GainExperience_experience_id_1101":"Vehicle Gunner Kill Assist Share - Magrider HIVE XP (Target)",
  "GainExperience_experience_id_1102":"Vehicle Gunner Kill Assist Share - Mosquito HIVE XP (Target)",
  "GainExperience_experience_id_1103":"Vehicle Gunner Kill Assist Share - Prowler HIVE XP (Target)",
  "GainExperience_experience_id_1104":"Vehicle Gunner Kill Assist Share - Reaver HIVE XP (Target)",
  "GainExperience_experience_id_1105":"Vehicle Gunner Kill Assist Share - Scythe HIVE XP (Target)",
  "GainExperience_experience_id_1106":"Vehicle Gunner Kill Assist Share - Sunderer HIVE XP (Target)",
  "GainExperience_experience_id_1107":"Vehicle Gunner Kill Assist Share - Vanguard HIVE XP (Target)",
  "GainExperience_experience_id_1108":"Vehicle Gunner Kill Assist Share - Harasser HIVE XP (Target)",
  "GainExperience_experience_id_1109":"Vehicle Passenger Kill Share - Infantry HIVE XP (Target)",
  "GainExperience_experience_id_1110":"Vehicle Passenger Kill Share - Flash HIVE XP (Target)",
  "GainExperience_experience_id_1111":"Vehicle Passenger Kill Share - Engineer Turret HIVE XP (Target)",
  "GainExperience_experience_id_1112":"Vehicle Passenger Kill Share - Phalanx HIVE XP (Target)",
  "GainExperience_experience_id_1113":"Vehicle Passenger Kill Share - Drop Pod HIVE XP (Target)",
  "GainExperience_experience_id_1114":"Vehicle Passenger Kill Share - Galaxy HIVE XP (Target)",
  "GainExperience_experience_id_1115":"Vehicle Passenger Kill Share - Liberator HIVE XP (Target)",
  "GainExperience_experience_id_1116":"Vehicle Passenger Kill Share - Lightning HIVE XP (Target)",
  "GainExperience_experience_id_1117":"Vehicle Passenger Kill Share - Magrider HIVE XP (Source)",
  "GainExperience_experience_id_1118":"Vehicle Passenger Kill Share - Mosquito HIVE XP (Source)",
  "GainExperience_experience_id_1119":"Vehicle Passenger Kill Share - Prowler HIVE XP (Source)",
  "GainExperience_experience_id_1120":"Vehicle Passenger Kill Share - Reaver HIVE XP (Source)",
  "GainExperience_experience_id_1121":"Vehicle Passenger Kill Share - Scythe HIVE XP (Source)",
  "GainExperience_experience_id_1122":"Vehicle Passenger Kill Share - Sunderer HIVE XP (Source)",
  "GainExperience_experience_id_1123":"Vehicle Passenger Kill Share - Vanguard HIVE XP (Source)",
  "GainExperience_experience_id_1124":"Vehicle Passenger Kill Share - Harasser HIVE XP (Source)",
  "GainExperience_experience_id_1125":"Vehicle Driver Kill Assist Share - Infantry HIVE XP (Source)",
  "GainExperience_experience_id_1126":"Vehicle Driver Kill Assist Share - Flash HIVE XP (Source)",
  "GainExperience_experience_id_1127":"Vehicle Driver Kill Assist Share - Engi Turret HIVE XP (Source)",
  "GainExperience_experience_id_1128":"Vehicle Driver Kill Assist Share - Phalanx HIVE XP (Source)",
  "GainExperience_experience_id_1129":"Vehicle Driver Kill Assist Share - Drop Pod HIVE XP (Source)",
  "GainExperience_experience_id_1130":"Vehicle Driver Kill Assist Share - Galaxy HIVE XP (Source)",
  "GainExperience_experience_id_1131":"Vehicle Driver Kill Assist Share - Liberator HIVE XP (Source)",
  "GainExperience_experience_id_1132":"Vehicle Driver Kill Assist Share - Lightning HIVE XP (Source)",
  "GainExperience_experience_id_1133":"Vehicle Driver Kill Assist Share - Magrider HIVE XP (Source)",
  "GainExperience_experience_id_1134":"Vehicle Driver Kill Assist Share - Mosquito HIVE XP (Source)",
  "GainExperience_experience_id_1135":"Vehicle Driver Kill Assist Share - Prowler HIVE XP (Source)",
  "GainExperience_experience_id_1136":"Vehicle Driver Kill Assist Share - Reaver HIVE XP (Source)",
  "GainExperience_experience_id_1137":"Vehicle Passenger Kill Share - Magrider HIVE XP (Target)",
  "GainExperience_experience_id_1138":"Vehicle Passenger Kill Share - Mosquito HIVE XP (Target)",
  "GainExperience_experience_id_1139":"Vehicle Passenger Kill Share - Prowler HIVE XP (Target)",
  "GainExperience_experience_id_1140":"Vehicle Passenger Kill Share - Reaver HIVE XP (Target)",
  "GainExperience_experience_id_1141":"Vehicle Passenger Kill Share - Scythe HIVE XP (Target)",
  "GainExperience_experience_id_1142":"Vehicle Passenger Kill Share - Sunderer HIVE XP (Target)",
  "GainExperience_experience_id_1143":"Vehicle Passenger Kill Share - Vanguard HIVE XP (Target)",
  "GainExperience_experience_id_1144":"Vehicle Passenger Kill Share - Harasser HIVE XP (Target)",
  "GainExperience_experience_id_1145":"Vehicle Driver Kill Assist Share - Infantry HIVE XP (Target)",
  "GainExperience_experience_id_1146":"Vehicle Driver Kill Assist Share - Flash HIVE XP (Target)",
  "GainExperience_experience_id_1147":"Vehicle Driver Kill Assist Share - Engi Turret HIVE XP (Target)",
  "GainExperience_experience_id_1148":"Vehicle Driver Kill Assist Share - Phalanx HIVE XP (Target)",
  "GainExperience_experience_id_1149":"Vehicle Driver Kill Assist Share - Drop Pod HIVE XP (Target)",
  "GainExperience_experience_id_1150":"Vehicle Driver Kill Assist Share - Galaxy HIVE XP (Target)",
  "GainExperience_experience_id_1151":"Vehicle Driver Kill Assist Share - Liberator HIVE XP (Target)",
  "GainExperience_experience_id_1152":"Vehicle Driver Kill Assist Share - Lightning HIVE XP (Target)",
  "GainExperience_experience_id_1153":"Vehicle Driver Kill Assist Share - Magrider HIVE XP (Target)",
  "GainExperience_experience_id_1154":"Vehicle Driver Kill Assist Share - Mosquito HIVE XP (Target)",
  "GainExperience_experience_id_1155":"Vehicle Driver Kill Assist Share - Prowler HIVE XP (Target)",
  "GainExperience_experience_id_1156":"Vehicle Driver Kill Assist Share - Reaver HIVE XP (Target)",
  "GainExperience_experience_id_1157":"Vehicle Driver Kill Assist Share - Scythe HIVE XP (Source)",
  "GainExperience_experience_id_1158":"Vehicle Driver Kill Assist Share - Sunderer HIVE XP (Source)",
  "GainExperience_experience_id_1159":"Vehicle Driver Kill Assist Share - Vanguard HIVE XP (Source)",
  "GainExperience_experience_id_1160":"Vehicle Driver Kill Assist Share - Harasser HIVE XP (Source)",
  "GainExperience_experience_id_1161":"Valkyrie Kill by Sunderer Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1162":"Valkyrie Kill by Magrider Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1163":"Valkyrie Kill by Vanguard Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1164":"Valkyrie Kill by Prowler Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1165":"Valkyrie Kill by Liberator Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1166":"Valkyrie Kill by Galaxy Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1167":"Player Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1168":"Vehicle Gunner Kill Share - Valkyrie HIVE XP (Source)",
  "GainExperience_experience_id_1169":"Vehicle Gunner Kill Assist Share - Valkyrie HIVE XP (Source)",
  "GainExperience_experience_id_1170":"Vehicle Passenger Kill Share - Valkyrie HIVE XP (Source)",
  "GainExperience_experience_id_1171":"Vehicle Driver Kill Assist Share - Valkyrie HIVE XP (Source)",
  "GainExperience_experience_id_1172":"Flash Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1173":"Sunderer Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1174":"Lightning Kill by Valkyrie Gunne HIVE XP (Source)",
  "GainExperience_experience_id_1175":"Vanguard Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1176":"Prowler Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1177":"Vehicle Driver Kill Assist Share - Scythe HIVE XP (Target)",
  "GainExperience_experience_id_1178":"Vehicle Driver Kill Assist Share - Sunderer HIVE XP (Target)",
  "GainExperience_experience_id_1179":"Vehicle Driver Kill Assist Share - Vanguard HIVE XP (Target)",
  "GainExperience_experience_id_1180":"Vehicle Driver Kill Assist Share - Harasser HIVE XP (Target)",
  "GainExperience_experience_id_1181":"Valkyrie Kill by Sunderer Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1182":"Valkyrie Kill by Magrider Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1183":"Valkyrie Kill by Vanguard Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1184":"Valkyrie Kill by Prowler Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1185":"Valkyrie Kill by Liberator Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1186":"Valkyrie Kill by Galaxy Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1187":"Player Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1188":"Vehicle Gunner Kill Share - Valkyrie HIVE XP (Target)",
  "GainExperience_experience_id_1189":"Vehicle Gunner Kill Assist Share - Valkyrie HIVE XP (Target)",
  "GainExperience_experience_id_1190":"Vehicle Passenger Kill Share - Valkyrie HIVE XP (Target)",
  "GainExperience_experience_id_1191":"Vehicle Driver Kill Assist Share - Valkyrie HIVE XP (Target)",
  "GainExperience_experience_id_1192":"Flash Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1193":"Sunderer Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1194":"Lightning Kill by Valkyrie Gunne HIVE XP (Target)",
  "GainExperience_experience_id_1195":"Vanguard Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1196":"Prowler Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1197":"Reaver Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1198":"Mosquito Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1199":"Lib Kill by Valkyrie HIVE XP (Source)",
  "GainExperience_experience_id_1200":"Galaxy Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1201":"Magrider Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1202":"Scythe Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1203":"Snowman Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1204":"Valkyrie Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1205":"Harasser Kill by Valkyrie Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1206":"Valkyrie Kill by Harasser Gunner HIVE XP (Source)",
  "GainExperience_experience_id_1207":"Destroy Spitfire Turret HIVE XP (Source)",
  "GainExperience_experience_id_1208":"Vehicle Gunner Kill Share - Spitfire HIVE XP (Source)",
  "GainExperience_experience_id_1209":"Vehicle Gunner Kill Assist Share - Spitfire HIVE XP (Source)",
  "GainExperience_experience_id_1210":"Vehicle Passenger Kill Share - Spitfire HIVE XP (Source)",
  "GainExperience_experience_id_1211":"Vehicle Driver Kill Assist Share - Engi Turret HIVE XP (Source)",
  "GainExperience_experience_id_1212":"Kill/Destroy - Construction - Med HIVE XP (Source)",
  "GainExperience_experience_id_1214":"Repair - Construction - Med HIVE XP (Source)",
  "GainExperience_experience_id_1215":"KillAssist - Construction - Med HIVE XP (Source)",
  "GainExperience_experience_id_1217":"Reaver Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1218":"Mosquito Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1219":"Lib Kill by Valkyrie HIVE XP (Target)",
  "GainExperience_experience_id_1220":"Galaxy Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1221":"Magrider Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1222":"Scythe Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1223":"Snowman Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1224":"Valkyrie Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1225":"Harasser Kill by Valkyrie Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1226":"Valkyrie Kill by Harasser Gunner HIVE XP (Target)",
  "GainExperience_experience_id_1227":"Destroy Spitfire Turret HIVE XP (Target)",
  "GainExperience_experience_id_1228":"Vehicle Gunner Kill Share - Spitfire HIVE XP (Target)",
  "GainExperience_experience_id_1229":"Vehicle Gunner Kill Assist Share - Spitfire HIVE XP (Target)",
  "GainExperience_experience_id_1230":"Vehicle Passenger Kill Share - Spitfire HIVE XP (Target)",
  "GainExperience_experience_id_1231":"Vehicle Driver Kill Assist Share - Engi Turret HIVE XP (Target)",
  "GainExperience_experience_id_1232":"Kill/Destroy - Construction - Med HIVE XP (Target)",
  "GainExperience_experience_id_1234":"Repair - Construction - Med HIVE XP (Target)",
  "GainExperience_experience_id_1235":"KillAssist - Construction - Med HIVE XP (Target)",
  "GainExperience_experience_id_1237":"Spot Kill - Construction - Med  HIVE XP (Source)",
  "GainExperience_experience_id_1238":"Gunner Kill Share - Construction - Med HIVE XP (Source)",
  "GainExperience_experience_id_1239":"Gunner Kill Assist Share - Construction - Med HIVE XP (Source)",
  "GainExperience_experience_id_1240":"Vehicle Passenger Kill Share - Construction - Med HIVE XP (Source)",
  "GainExperience_experience_id_1241":"Driver Kill Aassist Share - Construction - Med HIVE XP (Source)",
  "GainExperience_experience_id_1242":"Vehicle Ram Kill - Construction - Small HIVE XP (Source)",
  "GainExperience_experience_id_1243":"Kill/Destroy - Construction - Small HIVE XP (Source)",
  "GainExperience_experience_id_1245":"Repair - Construction - Small HIVE XP (Source)",
  "GainExperience_experience_id_1246":"KillAssist - Construction - Small HIVE XP (Source)",
  "GainExperience_experience_id_1248":"Spot Kill - Construction - Small  HIVE XP (Source)",
  "GainExperience_experience_id_1249":"Gunner Kill Share - Construction - Small HIVE XP (Source)",
  "GainExperience_experience_id_1250":"Gunner Kill Assist Share - Construction - Small HIVE XP (Source)",
  "GainExperience_experience_id_1251":"Vehicle Passenger Kill Share - Construction - Small HIVE XP (Source)",
  "GainExperience_experience_id_1252":"Driver Kill Aassist Share - Construction - Small HIVE XP (Source)",
  "GainExperience_experience_id_1253":"Vehicle Ram Kill - Construction - Large HIVE XP (Source)",
  "GainExperience_experience_id_1254":"Kill/Destroy - Construction - Large HIVE XP (Source)",
  "GainExperience_experience_id_1255":"Spot Kill - Construction - Med  HIVE XP (Target)",
  "GainExperience_experience_id_1256":"Gunner Kill Share - Construction - Med HIVE XP (Target)",
  "GainExperience_experience_id_1257":"Gunner Kill Assist Share - Construction - Med HIVE XP (Target)",
  "GainExperience_experience_id_1258":"Vehicle Passenger Kill Share - Construction - Med HIVE XP (Target)",
  "GainExperience_experience_id_1259":"Driver Kill Aassist Share - Construction - Med HIVE XP (Target)",
  "GainExperience_experience_id_1260":"Vehicle Ram Kill - Construction - Small HIVE XP (Target)",
  "GainExperience_experience_id_1261":"Kill/Destroy - Construction - Small HIVE XP (Target)",
  "GainExperience_experience_id_1263":"Repair - Construction - Small HIVE XP (Target)",
  "GainExperience_experience_id_1264":"KillAssist - Construction - Small HIVE XP (Target)",
  "GainExperience_experience_id_1266":"Spot Kill - Construction - Small  HIVE XP (Target)",
  "GainExperience_experience_id_1267":"Gunner Kill Share - Construction - Small HIVE XP (Target)",
  "GainExperience_experience_id_1268":"Gunner Kill Assist Share - Construction - Small HIVE XP (Target)",
  "GainExperience_experience_id_1269":"Vehicle Passenger Kill Share - Construction - Small HIVE XP (Target)",
  "GainExperience_experience_id_1270":"Driver Kill Aassist Share - Construction - Small HIVE XP (Target)",
  "GainExperience_experience_id_1271":"Vehicle Ram Kill - Construction - Large HIVE XP (Target)",
  "GainExperience_experience_id_1272":"Kill/Destroy - Construction - Large HIVE XP (Target)",
  "GainExperience_experience_id_1273":"Repair - Construction - Large HIVE XP (Source)",
  "GainExperience_experience_id_1274":"KillAssist - Construction - Large HIVE XP (Source)",
  "GainExperience_experience_id_1276":"Spot Kill - Construction - Large  HIVE XP (Source)",
  "GainExperience_experience_id_1277":"Gunner Kill Share - Construction - Large HIVE XP (Source)",
  "GainExperience_experience_id_1278":"Gunner Kill Assist Share - Construction - Large HIVE XP (Source)",
  "GainExperience_experience_id_1279":"Vehicle Passenger Kill Share - Construction - Large HIVE XP (Source)",
  "GainExperience_experience_id_1280":"Driver Kill Aassist Share - Construction - Large HIVE XP (Source)",
  "GainExperience_experience_id_1281":"Vehicle Ram Kill - Construction - Core HIVE XP (Source)",
  "GainExperience_experience_id_1282":"Kill/Destroy - Construction - Core HIVE XP (Source)",
  "GainExperience_experience_id_1283":"Repair - Construction - Core HIVE XP (Source)",
  "GainExperience_experience_id_1284":"KillAssist - Construction - Core HIVE XP (Source)",
  "GainExperience_experience_id_1286":"Spot Kill - Construction - Core  HIVE XP (Source)",
  "GainExperience_experience_id_1287":"Gunner Kill Share - Construction - Core HIVE XP (Source)",
  "GainExperience_experience_id_1288":"Gunner Kill Assist Share - Construction - Core HIVE XP (Source)",
  "GainExperience_experience_id_1289":"Repair - Construction - Large HIVE XP (Target)",
  "GainExperience_experience_id_1290":"KillAssist - Construction - Large HIVE XP (Target)",
  "GainExperience_experience_id_1292":"Spot Kill - Construction - Large  HIVE XP (Target)"
}