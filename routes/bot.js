require("dotenv").config({path:"../.env"});
const express = require("express");
const startDiscordBot = require("../bot/clover-bot");
const memberModel = require("../models/member");
const applicationModel = require("../models/application");
const riotHttpClient = require("../util/riot-http-client");
// TODO - impl db call through document when applicable
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
      let activeMemberMap = {};

      // guild.members.fetch() returns weird format that wraps into array of two element [id, GuildMember] when using for..of
      // iterating through with forEach only saves GuildMember object, so using it to unwrap the response before for..of
      membersObject.forEach(member => {
        members.push(member);
      })

      for(const member of members){
        const roles = [];
        let memberType = "GUEST";

        member.roles.cache.forEach(role => {
          roles.push(role.name);
          if(role.name === "신입"){
            memberType = "NEW";
          }
          if(role.name === "정멤" || role.name === "CR 운영진" || role.name === "장기 잠수"){
            memberType = "MEMBER";
          }
        });

        let inGameName = "";
        let displayName = member.user.username;
        let hasCRPrefix = false;
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
            hasCRPrefix = true;
            inGameName = inGameName.trimEnd();
          }
        }
        activeMemberMap[member.user.id] = true;

        await memberModel.updateOne({
          _id: member.user.id
        },{
          $set: {
            _id: member.user.id,
            displayName: displayName,
            name: member.user.username,
            roles: roles,
            tag: member.user.tag,
            inGameName: inGameName,
            memberType: memberType,
            hasCRPrefix: hasCRPrefix,
            active: true,
            createdAt: member.user.createdAt,
            joinedAt: member.joinedAt,
            updatedAt: new Date()
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

      let inactiveMemberList = [];
      let oldActiveMemberList = await memberModel.find({
        active: true
      },{
        _id: 1
      })

      oldActiveMemberList.forEach(member => {
        if(!(member._id in activeMemberMap)){
          inactiveMemberList.push(member._id);
        }
      })

      for(let inactiveMemberId of inactiveMemberList){
        await memberModel.updateOne({
          _id: inactiveMemberId
        },{
          $set: {
            active: false
          }
        })

        console.log("UserID: " + inactiveMemberId + " is now inactive.");
      }

      console.log("Total: " + count + " member upserted to DB.");
      res.send("Total: " + count + " member upserted to DB.");
      upsertOperation = false;
    } catch(e){
      console.log("Aborting entire upsert-member operation.");
      e.trace = "Upsert-member operation";
      next(e);
    }
  }
});

router.route("/application-match").get(async (req, res, next) => {
  try {
    if(upsertOperation){
      res.send("Upsert operation is currently in progress.");
    } else {
      let unmatchedApplicationList = await applicationModel.find({
        dataTransferred: false
      },{
        note: 1,
        inGameName: 1
      });

      if(unmatchedApplicationList.length > 0){
        let newMemberTypeList = await memberModel.find({
          memberType: "NEW"
        },{
          _id: 1,
          displayName: 1
        });
  
        for(let applicant of unmatchedApplicationList){
          applicant.inGameName = applicant.inGameName.toLowerCase().replace('/\s/g', "");
        }
  
        for(let newMember of newMemberTypeList){
          for(let applicant of unmatchedApplicationList){
            let displayMatchString = newMember.displayName.toLowerCase().replace('/\s/g', "");
  
            if(displayMatchString.includes(applicant.inGameName)){
              let currentDate = new Date();
  
              await memberModel.updateOne({
                _id: newMember._id
              },{
                $set: {
                  note: applicant.note,
                  updatedAt: currentDate
                }
              });
  
              await applicationModel.updateOne({
                _id: applicant._id
              },{
                $set: {
                  dataTransferred: true,
                  updatedAt: currentDate
                }
              });
  
              console.log("Applicant: " + applicant.inGameName + " had matching discord profile and was updated with application information.");
            }
          }
        }
      }
      
      res.status(200).send("Application matching complete.");
    }
  } catch(e){
    console.log("Aborting application match operation.");
    e.trace = "Application match operation";
    next(e);
  }
})

router.route("/upsert-tier").get(async (req, res, next) => {
  try {
    if(upsertOperation){
      res.send("Upsert operation is currently in progress.");
    } else {
      upsertOperation = true;
      res.send("Upsert tier operation started.");
      memberList = await memberModel.find({
        hasCRPrefix: true
      });
    
      for(let member of memberList){
        let operationFailed = false;
        let summonerId = member.summonerId;
        if(!summonerId){
          await riotHttpClient.get(process.env.RIOT_BASE_URL + "/summoner/v4/summoners/by-name/" + member.inGameName).then(res => {
            switch(res.status){
              case 200:
                summonerId = res.data.id;
                riotAccountId = res.data.accountId;
                riotPUUID = res.data.puuid;
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
                summonerId: summonerId,
                riotAccountId: riotAccountId,
                riotPUUID: riotPUUID
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
          }
          
          if(operationFailed){
            console.log("Aborting entire upsert-tier operation during summonerId update.");
            break;
          }
        }

        let rankInfoObj = {};

        if(summonerId){
          await riotHttpClient.get(process.env.RIOT_BASE_URL + "/league/v4/entries/by-summoner/" + summonerId).then(res => {
            switch(res.status){
              case 200:
                if(res.data && res.data.length > 0){
                  res.data.forEach(rankInfo => {
                    // CHERRY is ARENA queueType, currently bugged and doesn't have tier and rank info in the API
                    if(rankInfo.queueType != 'CHERRY'){
                      rankInfoObj[rankInfo.queueType] = {
                        tier: rankInfo.tier,
                        rank: rankInfo.rank,
                        leaguePoints: rankInfo.leaguePoints,
                        wins: rankInfo.wins,
                        losses: rankInfo.losses,
                        updatedAt: new Date()
                      }
                    }
                  })
                }
                break;
              default:
                console.log("by-summoner call with IGN: " + member.inGameName + ", Discord: " + member.tag + ", Unhandled Status: " + res.status);
            }
          }).catch(err => {
            switch(err.response.status){
              case 404:
                console.log("by-summoner call with IGN: " + member.inGameName + ", Discord: " + member.tag + " does not exist.");
                break;
              default:
                console.log("by-summoner call with IGN: " + member.inGameName + ", Discord: " + member.tag + " failed with following status: " + err.response.status);
                next(err);
                operationFailed = true;
                break;
            }
          });

          if(rankInfoObj){
            let rankInfoDTO = member.ranks;
            if(rankInfoDTO){
              let newRankInfoKeys = Object.keys(rankInfoObj);
              newRankInfoKeys.forEach(key => {
                rankInfoDTO[key] = rankInfoObj[key];
              });
            } else {
              rankInfoDTO = rankInfoObj;
            }
            await memberModel.updateOne({
              _id: member._id
            },{
              $set: {
                ranks: rankInfoDTO
              }
            },{
              upsert: true
            }).then(() => {
              console.log("Ranks successfully updated for " + member.inGameName + ", Discord: " + member.tag);
            }).catch(err => {
              console.log("Ranks DB update for IGN: " + member.inGameName + ", Discord: " + member.tag + " failed with following reason.");
              next(err);
              operationFailed = true;
            });
          }
  
          if(operationFailed){
            console.log("Aborting entire upsert-tier operation during rank-tier update.");
            break;
          }
        }
      };
      console.log("Upsert tier operation is complete.");
      upsertOperation = false;
    }
  } catch(e) {
    e.trace = "Upsert-tier operation";
    next(e);
  }
});

module.exports = router