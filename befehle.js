const fs = require("fs");
const Discord = require('discord.js');
const sf = require("snekfetch");
const ytdl = require("ytdl-core");
const { searchImages } = require('pixabay-api');
const { resolve } = require('path');

var befehle = {
    "sag": [(msg, args)=> { sag(msg, args) }, "sag <nachricht>"],
    "help": [(msg, args)=> { help(msg, args) }, "help (um diese Nachricht anzuzeigen)"],
    "bild": [(msg, args)=> { bild(msg, args) }, "bild (um ein zufälliges Wasserbild anzuzeigen)"],
    "modus": [(msg, args)=> { setModus(msg, args) }, "modus <Fluss | Wasserfall | Meer | Föhn>"],
    "join": [(msg, args)=> { join(msg, args) }, "join (läst den bot deinem Voicechat beitreten)"],
    "leave": [(msg, args)=> { proxyLeave(msg, args) }, "leave (kicked den bot aus dem Voicechat)"],
    "schaf": [(msg, args)=> { schaf(msg, args) }, "schaf (um ein zufälliges Schafsbild anzuzeigen)"],
    "zeig": [(msg, args)=> { zeig(msg, args) }, "zeig <Wort> (zeigt Bild zu dem Thema an)"],
}

var moduse = JSON.parse(fs.readFileSync("./moduse.json", "Utf-8"));
var config = JSON.parse(fs.readFileSync("./config.json", "Utf-8"));

var servers = {};

function info() {
    this.currentDispatcher = false;
    this.currentChannel = false;
    this.currentConnection = false;
    this.currentModus = moduse.Fluss;
}

function helpMsg(args = false) {
    if(args[0]) return befehle[args[0]][1] || "Befehl nicht gefunden";

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

function help(msg, args) {
    msg.reply(helpMsg(args));
}

async function join(msg, args) {
    if (!msg.member.voice.channel) return msg.reply('You need to join a voice channel first!');
    //Checks if the current server is loged if not it creates new instance
    let guildId = msg.guild.id;
    if(!servers[guildId]) servers[guildId] = new info();

    let currentInfo = servers[guildId];

    currentInfo.currentConnection = await msg.member.voice.channel.join();
    currentInfo.currentChannel = msg.member.voice.channel;

    play(currentInfo.currentConnection, msg = false, currentInfo);
}

function proxyLeave(msg, args) {
    let guildId = msg.guild.id

    let currentInfo = servers[guildId];

    if(!currentInfo.currentDispatcher) return;
    currentInfo.currentDispatcher.destroy();
    currentInfo.currentDispatcher = false;
    currentInfo.currentChannel.leave();
    currentInfo.currentChannel = false;
    currentInfo.currentConnection = false;
}

function play(connection, msg, currentInfo = false) {
    currentInfo = msg ? servers[msg.guild.id] : currentInfo;

    currentInfo.currentDispatcher = connection.play(ytdl(currentInfo.currentModus, { filter: 'audioonly', volume: 0.5 }));

    currentInfo.currentDispatcher.on('finish', () => {
        console.log('Finished playing!');
        leave(msg.guild.id);
    });
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

function isValidImageURL(str){
    if ( typeof str !== 'string' ) return false;
    return !!str.match(/\w+\.(jpg|jpeg|gif|png|tiff|bmp)$/gi);
}

function randomPicUrl(keyWord) {
    return new Promise(resolve => {
        resolve(searchImages(config.pix_token, keyWord,{per_page: 200}));
    });
}

async function zeig(msg, args) {
    var url = await randomPicUrl(args[0]).catch((err) => { msg.reply("Fehler beim Datenfluss, bitte versuche es erneut"); });
    if (url.hits.length < 1) { msg.reply("Kein Ergebnis gefunden!"); return; }
    url = url.hits[Math.floor(Math.random()*url.hits.length)].largeImageURL;
    const pic = new Discord.MessageAttachment(url);
    msg.channel.send(pic);
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

function sag(msg, args) {
    msg.reply(args);
}

module.exports = {
    "befehle": befehle,
    "servers": servers,
    "info": info,
    "moduse": moduse,
    "config": config
}