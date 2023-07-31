require("dotenv").config({path:"../.env"});
const express = require("express");
const startDiscordBot = require("../bot/clover-bot");
const memberModel = require("../models/member");
const riotHttpClient = require("../util/riot-http-client");

let router = express.Router();
let client;
let upsertOperation = false;
const KOREAN_REGEX = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/g;

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

router.route("/upsert-members").get(async (req, res, next) => {
  if(!client || upsertOperation){
    res.send("Discord bot is currently not running or upsert operation in process, unable to upsert members.");
  } else {
    try {
      upsertOperation = true;
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
            for(let i = 0; i < displayNameSplit.length; i++){
              if(!KOREAN_REGEX.test(displayNameSplit[i])){
                inGameName = inGameName + displayNameSplit[i] + " ";
              } else {
                break;
              }
            }
            inGameName = inGameName.trimEnd();
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
      upsertOperation = false;
    } catch(e){
      console.log("Aborting entire upsert-member operation.");
      next(e);
    }
  }
});

router.route("/upsert-tier").get(async (req, res, next) => {
  try {
    if(upsertOperation){
      res.send("Upsert operation is currently in progress.");
    } else {
      upsertOperation = true;
      memberList = await memberModel.find({
        isMember: true
      });
    
      for(let member of memberList){
        let operationFailed = false;
        let summonerId = member.summonerId;
        if(!summonerId){
          await riotHttpClient.get(process.env.RIOT_BASE_URL + "/summoner/v4/summoners/by-name/" + member.inGameName).then(res => {
            switch(res.status){
              case 200:
                summonerId = res.data.id;
                break;
              default:
                console.log("by-name call with IGN: " + member.inGameName + ", Discord: " + member.tag + ", Unhandled Status: " + res.status);
            }
          }).catch(err => {
            switch(err.response.status){
              case 404:
                console.log("by-name call with IGN: " + member.inGameName + ", Discord: " + member.tag + " does not exist.");
                break;
              default:
                console.log("by-name call with IGN: " + member.inGameName + ", Discord: " + member.tag + " failed with following status: " + err.response.status);
                next(err);
                operationFailed = true;
                break;
            }
          });
      
          if(summonerId){
            await memberModel.updateOne({
              _id: member._id
            },{
              $set: {
                summonerId: summonerId
              }
            },{
              upsert: true
            }).then(() => {
              console.log("SummonerId successfully updated for " + member.inGameName + ", Discord: " + member.tag);
            }).catch(err => {
              console.log("SummonerId DB update for IGN: " + member.inGameName + ", Discord: " + member.tag + " failed with following reason.");
              next(err);
              operationFailed = true;
            });

            // sample by-summoner
            // [
            //   {
            //       "leagueId": "a2510933-b65f-4cbe-8e8d-f16acb25c499",
            //       "queueType": "RANKED_FLEX_SR",
            //       "tier": "PLATINUM",
            //       "rank": "I",
            //       "summonerId": "2LKs82O67uyRDBJDZVXUxDcJPYmwRtz4K32VX96ybAo55p8",
            //       "summonerName": "13arkmore",
            //       "leaguePoints": 44,
            //       "wins": 5,
            //       "losses": 4,
            //       "veteran": false,
            //       "inactive": false,
            //       "freshBlood": true,
            //       "hotStreak": true
            //   },
            //   {
            //       "leagueId": "b3f08f6f-f2f4-4229-995e-69e5c65361bc",
            //       "queueType": "RANKED_SOLO_5x5",
            //       "tier": "GOLD",
            //       "rank": "I",
            //       "summonerId": "2LKs82O67uyRDBJDZVXUxDcJPYmwRtz4K32VX96ybAo55p8",
            //       "summonerName": "13arkmore",
            //       "leaguePoints": 80,
            //       "wins": 1,
            //       "losses": 4,
            //       "veteran": false,
            //       "inactive": false,
            //       "freshBlood": true,
            //       "hotStreak": false
            //   }
            // ]
          }
          
          if(operationFailed){
            console.log("Aborting entire upsert-tier operation.");
            break;
          }
        }
      };
      upsertOperation = false;
    }
  } catch(e) {
    next(e);
  }
  res.send("Upsert tier operation is complete.");
});

module.exports = router