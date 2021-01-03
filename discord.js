/*
  1812196369 (need Oauth2 for this)
  https://discord.com/oauth2/authorize?client_id=${process.env.BOT_CLIENT_ID}&scope=bot
  https://discord.com/oauth2/authorize?client_id=${process.env.BOT_CLIENT_ID}&scope=bot&permissions=134466624
*/
const Discord = require('discord.js');
const dotenv = require('dotenv');
const client = new Discord.Client();

require('dotenv').config();

client.once('ready', () => {
  console.log('Bot online!')
})

const prefix = '!';
const list_of_squads = [];

client.on('message', message => {
  if(!message.content.startsWith(prefix) || message.author.bot) return
  console.log(message)
  //console.log(message.guild)
  console.log(message.author.username)
  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();
  console.log(args)

  if(command === 'ping'){
    // check if admin user, maybe MANAGE_CHANNELS or MANAGE_GUILD
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
    }
    // TODO: make a real ping
    message.channel.send('pong!');
  } else if(command === 'help'){
    let res = "These are all the commands you can type:\n"
    // insert name (join <squad>)
    // remove name (leave <squad>)
    // see squad (get squad <squad>)
    // see all squad (get squad)
    // help
    if (message.member.hasPermission('ADMINISTRATOR') || message.member.hasPermission('MANAGE_CHANNELS') || message.member.hasPermission('MANAGE_GUILD')){
      // insert name (add <name> <squad>)
      // remove name (remove <name> <squad>)
      // clear all (clearall)
      // clear squad (clear <squad>)
      // add squad (add squad <squad>)
      // remove squad (remove squad <squad>)
      // start recording (start "<opsname>")
      // stop recording (stop "<opsname>")
      // stop all (stop)
    }
    message.channel.send(res);
  } else if(command === 'join'){
    // insert name (join <squad>)
    let squad = args[0];
    let name = message.author.username
  } else if(command === 'leave'){
    // remove name (leave <squad>)
    let squad = args[0];
    let name = message.author.username
  } else if(command === 'get' && args[0] === 'squad' && args[1] !== undefined){
    // see squad (get squad <squad>)

  } else if(command === 'get' && args[0] === 'squad'){
    // see all squad (get squad)
  } else if(command === 'add'){
    // insert name (add <name> <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
      return;
    }
    let squad = args[1];
    let name = args[0];
  } else if(command === 'add' && args[0] === 'squad'){
    // add squad (add squad <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
      return;
    }
    let squad = args[0];
    list_of_squads.push(squad);
  } else if(command === 'clear'){
    // clear squad (clear <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
      return;
    }
  } else if(command === 'clear' && args[0] === 'all'){
    // clear all (clear all)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
      return;
    }

  } else if(command === 'start'){
    // start recording (start "<opsname>")
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
      return;
    }
    let name = args[0];
  } else if(command === 'stop'){
    // stop recording (stop "<opsname>")
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
      return;
    }
    let name = args[0];
  } else if(command === 'stop'){
    // stop all (stop)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
      return;
    }
  } else if(command === 'remove' && args[0] === 'squad'){
    // remove squad (remove squad <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
      return;
    }
    let name = args[1];
  } else if(command === 'remove'){
    // remove name (remove <name> <squad>)
    if (!message.member.hasPermission('ADMINISTRATOR') || !message.member.hasPermission('MANAGE_CHANNELS') || !message.member.hasPermission('MANAGE_GUILD')){
      message.channel.send("Hey! You don't the permission to do that!");
      return;
    }
  }else{
    message.channel.send("Sorry I didn't understand, can you repeat, please? Or type !help for the list of commands");
  }
})



client.login(process.env.BOT_TOKEN)