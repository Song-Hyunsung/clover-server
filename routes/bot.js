require("dotenv").config({path:"../.env"});
const express = require("express");
const startDiscordBot = require("../bot/clover-bot");
const memberModel = require("../models/member");

let router = express.Router();
let client;

router.route("/start").get((req, res) => {
    if(!client){
        client = startDiscordBot();
        res.send("Discord bot successfully logged in.");
    } else {
        res.send("Discord bot is already logged in.");
    }
});

router.route("/destroy").get((req, res) => {
    if(client){
        client.destroy();
        client = null;
        res.send("Discord bot successfully destroyed.");
    } else {
        res.send("Discord bot is currently not running, unable to destory.");
    }
});

router.route("/upsert-members").get(async (req, res) => {
    if(!client){
        res.send("Discord bot is currently not running, unable to upsert members.");
    } else {
        try {
            const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
            const membersObject = await guild.members.fetch();
            let count = 0;
            let members = [];
    
            // guild.members.fetch() returns weird format that wraps into array of two element [id, GuildMember] when using for..of
            // iterating through with forEach only saves GuildMember object, so using it to unwrap the response before for..of
            membersObject.forEach(member => {
                members.push(member);
            })
    
            for(const member of members){
                const roles = [];
    
                member.roles.cache.forEach(role => {
                    roles.push(role.name);
                });
    
                let inGameName = "";
                let isMember = false;
                let displayName = member.user.username;
                if(member.nickname != null){
                    displayName = member.nickname;
                    let displayNameSplit = displayName.split(" ");
                    if(displayNameSplit.length > 2 && displayNameSplit[0] == "CR"){
                        inGameName = displayNameSplit[0] + " " + displayNameSplit[1];
                        isMember = true;
                    }
                }
    
                
    
                const memberDTO = {
                    _id: member.user.id,
                    displayName: displayName,
                    name: member.user.username,
                    roles: roles,
                    tag: member.user.tag,
                    inGameName: inGameName,
                    isMember: isMember,
                    createdAt: member.user.createdAt,
                    joinedAt: member.joinedAt,
                    updatedAt: new Date()
                }
    
                await memberModel.updateOne({
                    _id: memberDTO._id
                },{
                    $set: {
                        _id: memberDTO._id,
                        displayName: memberDTO.displayName,
                        name: memberDTO.name,
                        roles: memberDTO.roles,
                        tag: memberDTO.tag,
                        inGameName: memberDTO.inGameName,
                        isMember: memberDTO.isMember,
                        createdAt: memberDTO.createdAt,
                        joinedAt: memberDTO.joinedAt,
                        updatedAt: memberDTO.updatedAt
                    }
                },{
                    upsert: true
                }).then(() => {
                    count += 1;
                    if(count % 100 == 0){
                        console.log(count + " member upserted so far.");
                    }
                })
            }
    
            console.log("Total: " + count + " member upserted to DB.");
            res.send("Total: " + count + " member upserted to DB.");
        } catch(e){
            console.log("Error during discord bot upsert member operation.");
            console.log(e);
        }
    }

});

module.exports = router