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

client.on('message', message => {
  if(!message.content.startsWith(prefix) || message.author.bot) return
  console.log(message)
  //console.log(message.guild)
  //console.log(message.author.flags)
  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();

  if(command === 'ping'){
    if (message.member.hasPermission('ADMINISTRATOR')) console.log('User is an admin.');
    message.channel.send('pong!');
  }
  // insert name (join <squad>)
  // remove name (leave <squad>)
  // see squad (get squad <squad>)


  // insert name (add <name> <squad>)
  // remove name (remove <name> <squad>)

  // clear all (clearall)
  // clear squad (clear <squad>)
  // add squad (add squad <squad>)
  // add squad (remove squad <squad>)
})


/*
message.member.roles -> list of roles



*/


client.login(process.env.BOT_TOKEN)