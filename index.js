const Discord = require('discord.js');
const fs = require("fs");
const sf = require("snekfetch");
const ytdl = require("ytdl-core");
const { searchImages } = require('pixabay-api');
const { resolve } = require('path');

const client = new Discord.Client();

var config = JSON.parse(fs.readFileSync("./config.json", "Utf-8"));

function info() {
    this.currentDispatcher = false;
    this.currentChannel = false;
    this.currentConnection = false;
    this.currentModus = moduse.Fluss;
}

var servers = {};

var moduse = {
    "Fluss": "https://www.youtube.com/watch?v=1t7g690boao",
    "Wasserfall": "https://www.youtube.com/watch?v=kg3ElG-H7Wo",
    "Meer": "https://www.youtube.com/watch?v=vPhg6sc1Mk4"
}


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  /*if (msg.content === 'ping') {
    msg.reply('pong');
  }*/
  if(msg.content.charAt(0) !== "~") return;
  msg.content = msg.content.substring(1);

  var befehl = msg.content.split(" ")[0];
  var args = msg.content.split(" ");
  args.shift();

  //if(befehl === "sag") msg.reply(args);
  if(befehl in befehle) {
      befehle[befehl][0](msg, args);
  }
});

client.login(config.token);

var befehle = {
    "sag": [(msg, args)=> { sag(msg, args) }, "sag <nachricht>"],
    "help": [(msg, args)=> { help(msg, args) }, "help (um diese Nachricht anzuzeigen)"],
    "bild": [(msg, args)=> { bild(msg, args) }, "bild (um ein zufälliges Wasserbild anzuzeigen)"],
    "modus": [(msg, args)=> { setModus(msg, args) }, "modus <Fluss | Wasserfall | Meer>"],
    "join": [(msg, args)=> { join(msg, args) }, "join (läst den bot deinem Voicechat beitreten)"],
    "leave": [(msg, args)=> { proxyLeave(msg, args) }, "leave (kicked den bot aus dem Voicechat)"],
    "schaf": [(msg, args)=> { schaf(msg, args) }, "schaf (um ein zufälliges Schafsbild anzuzeigen)"],
}

function sag(msg, args) {
    msg.reply(args);
}

function help(msg, args) {
    msg.reply(helpMsg(args));
}

async function bild(msg, args) {
    var url = await randomWaterPic().catch((err) => { msg.reply("Fehler beim Datenfluss, bitte versuche es erneut"); });
    const pic = new Discord.MessageAttachment(url);
    msg.channel.send(pic);
}

function randomWaterPic() {
    return new Promise(resolve => {
        sf.get("https://www.reddit.com/r/waterporn/random.json?limit=1").then(res => {
            resolve(res.body[0].data.children[0].data.url);
        });
    });
}

function randomPicUrl(keyWord) {
    return new Promise(resolve => {
        resolve(searchImages(config.pix_token, keyWord,{per_page: 200})); //.then((r) => resolve(r.hits[Math.floor(Math.random()*200)].largeImageURL));
    });
}

async function schaf(msg, args) {
    let url;
    if(Math.random()*10 > 8) url = await randomSheepPic().catch((err) => { return msg.reply("Fehler beim scheren, bitte versuche es erneut"); });
    if(!url) {
        url = await randomPicUrl("sheep").catch((err) => { return msg.reply("Fehler beim scheren, bitte versuche es erneut"); });
        url = url.hits[Math.floor(Math.random()*200)].largeImageURL;
    }
    if(!url) return schaf(msg, args);
    const pic = new Discord.MessageAttachment(url);
    msg.channel.send(pic);
}

function isValidImageURL(str){
    if ( typeof str !== 'string' ) return false;
    return !!str.match(/\w+\.(jpg|jpeg|gif|png|tiff|bmp)$/gi);
}



function randomSheepPic() {
    return new Promise(resolve => {
        sf.get("https://www.reddit.com/r/sheep/random.json?limit=1").then(res => {
            let data = res.body[0].data.children[0].data;
            console.log("got Post...");
            if(data.selftext === "" && !data.over_18 && isValidImageURL(data.url)) return resolve(data.url);
            resolve(false);
        });
        
    });
}

function helpMsg(args = false) {
    if(args[0]) return "Not implemented yet";

    var keys = Object.keys(befehle);
    var msg = `\`\`\`
    Befehle werden mit dem Prefix "~" benutzt.

    Es gibt folgende Befehle:`;
    for(i = 0; i < keys.length;i++) {
        msg += `
        ${befehle[keys[i]][1]} `;
    }
    msg += `
    Für spezielle Hilfe:
        help <befehl>\`\`\``;
    return msg;
}


async function join(msg, args) {
    if (!msg.member.voice.channel) return msg.reply('You need to join a voice channel first!');
    //Checks if the current server is loged if not it creates new instance
    let guildId = msg.guild.id;
    if(!servers[guildId]) servers[guildId] = new info();

    let currentInfo = servers[guildId];

    currentInfo.currentConnection = await msg.member.voice.channel.join();
    currentInfo.currentChannel = msg.member.voice.channel;
    play(currentinfo.currentConnection, msg);
}

function play(connection, msg, currentInfo = false) {
    currentInfo = msg ? servers[msg.guild.id] : currentInfo;

    currentInfo.currentDispatcher = connection.play(ytdl(currentInfo.currentModus, { filter: 'audioonly', volume: 0.5 }));

    currentInfo.currentDispatcher.on('finish', () => {
        console.log('Finished playing!');
        leave(msg.guild.id);
    });
}

function proxyLeave(msg, args) {
    leave(msg.guild.id);
}

function leave(guildId) {

    let currentInfo = servers[guildId];

    if(!currentInfo.currentDispatcher) return;
    console.log("leaving...");
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
  
      console.log("Someone leaving channel...");
      if(currentInfo.currentChannel.members.size === 1) leave(guildId);
  
    }
});

async function cOnConnect(currentInfo) {
    currentInfo.currentConnection = await currentInfo.currentChannel.join();
    console.log("autoconnect...");
    play(currentInfo.currentConnection, false, currentInfo);
}

function setModus(msg, args) {
    let guildId = msg.guild.id;

    if(!servers[guildId]) servers[guildId] = new info();

    let currentInfo = servers[guildId];


    if(args[0] in moduse) {
        currentInfo.currentModus = moduse[args[0]];
        msg.reply(`Modus auf ${args[0]} gesetzt`);
        if(currentInfo.currentDispatcher) currentInfo.currentDispatcher.destroy();
        currentInfo.currentDispatcher = false;
        if(currentInfo.currentConnection) play(currentInfo.currentConnection, msg = false, currentInfo);
  }else {
      msg.reply("Wähle Fluss, Wasserfall oder Meer");
  }
}