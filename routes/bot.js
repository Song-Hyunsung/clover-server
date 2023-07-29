const express = require("express");
const startDiscordBot = require("../bot/clover-bot");

let router = express.Router();
let client;

router.route("/start").get((req, res) => {
    if(!client){
        client = startDiscordBot();
        res.send("Discord bot successfully logged in.");
    } else {
        res.send("Discord bot is already logged in.");
    }
})

router.route("/destroy").get((req, res) => {
    if(client){
        client.destroy();
        client = null;
        res.send("Discord bot successfully destroyed.");
    } else {
        res.send("Discord bot is currently not running, unable to destory.");
    }
    
})

module.exports = router