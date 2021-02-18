const Discord = require('discord.js');
const sf = require("snekfetch");
const ytdl = require("ytdl-core");
const { searchImages } = require('pixabay-api');
const { resolve } = require('path');

const client = new Discord.Client();

const { befehle, servers, info, moduse, config } = require("./befehle.js");

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {

  if(msg.content.charAt(0) !== "~") return;
  msg.content = msg.content.substring(1);

  var befehl = msg.content.split(" ")[0];
  var args = msg.content.split(" ");
  args.shift();

  if(befehl in befehle) {
      befehle[befehl][0](msg, args);
  }
});

client.login(config.token);

function play(connection, msg, currentInfo = false) {
    currentInfo = msg ? servers[msg.guild.id] : currentInfo;

    currentInfo.currentDispatcher = connection.play(ytdl(currentInfo.currentModus, { filter: 'audioonly', volume: 0.5 }));

    currentInfo.currentDispatcher.on('finish', () => {
        console.log('Finished playing!');
        leave(msg.guild.id);
    });
}

function leave(guildId) {

    let currentInfo = servers[guildId];

    if(!currentInfo.currentDispatcher) return;
    currentInfo.currentDispatcher.destroy();
    currentInfo.currentDispatcher = false;
    currentInfo.currentChannel.leave();
    currentInfo.currentChannel = false;
    currentInfo.currentConnection = false;
}

client.on('voiceStateUpdate', async (oldMember, newMember) => {
    let newUserChannel = newMember.channelID
    let oldUserChannel = oldMember.channelID

    let guildId = newMember.guild.id ? newMember.guild.id : oldMember.guild.id;

    if(!servers[guildId]) servers[guildId] = new info();

    let currentInfo = servers[guildId];

  
    if(newUserChannel) {
  
       // User Joins a voice channel

       if(currentInfo.currentChannel) return;
       currentInfo.currentChannel = await client.channels.cache.get(newUserChannel);
       if(!currentInfo.currentDispatcher) cOnConnect(currentInfo);

    } else if(currentInfo && currentInfo.currentChannel) {
      
      if(!currentInfo.currentChannel.members.some(member=>!member.user.bot)) leave(guildId);

    }
});

async function cOnConnect(currentInfo) {
    currentInfo.currentConnection = await currentInfo.currentChannel.join();
    play(currentInfo.currentConnection, false, currentInfo);
}


