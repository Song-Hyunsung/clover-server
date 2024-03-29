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
        let longTermAfk = false;

        member.roles.cache.forEach(role => {
          roles.push(role.name);
          if(role.name === "신입"){
            memberType = "NEW";
          }
          if(role.name === "정멤" || role.name === "CR 운영진" || role.name === "장기 잠수"){
            memberType = "MEMBER";
            if(role.name === "장기 잠수"){
              longTermAfk = true;
            }
          }
        });

        let displayName = member.user.username;
        let riotGameName = "";
        if(member.nickname != null){
          displayName = member.nickname;
          let displayNameSplit = displayName.split(" ");
          if(displayNameSplit.length > 3 && (memberType === "NEW" || memberType === "MEMBER")){
            for(let i = 1; i < displayNameSplit.length-2; i++){
              riotGameName = riotGameName + " " + displayNameSplit[i];
            }
            riotGameName = riotGameName.trim()
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
            memberType: memberType,
            riotGameName: riotGameName,
            active: true,
            longTermAfk: longTermAfk,
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

router.route("/upsert-riot-identifiers").get(async (req, res, next) => {
  try {
    if(upsertOperation){
      res.send("Upsert operation is currently in progress.");
    } else {
      upsertOperation = true;
      res.send("Upsert riot identifiers operation started.");
      memberList = await memberModel.find({
        active: true,
        memberType: "MEMBER",
        longTermAfk: false,
        riotPUUID: {$exists: false}
      });

      for(let member of memberList){
        if(member.riotGameName){
          let operationFailed = false;
          let riotPUUID = "";
          await riotHttpClient.get(process.env.RIOT_ACCOUNT_BASE_URL + "/account/v1/accounts/by-riot-id/" + member.riotGameName + "/클로버").then(res => {
            switch(res.status){
              case 200:
                riotPUUID = res.data.puuid;
                break;
              default:
                console.log("by-riot-id call with RiotID: " + member.riotGameName + ", Unhandled Status: " + res.status);
            }
          }).catch(err => {
            switch(err.response.status){
              case 404:
                console.log("by-riot-id  call with RiotID: " + member.riotGameName + " does not exist.");
                break;
              default:
                console.log("by-riot-id  call with RiotID: " + member.riotGameName + " failed with following status: " + err.response.status);
                next(err);
                operationFailed = true;
                break;
            }
          });

          let summonerId = "";
          let riotAccountId = "";

          if(operationFailed){
            console.log("Aborting entire upsert-riot identifiers operation during RiotPUUID update.");
            break;
          }

          if(riotPUUID){
            await riotHttpClient.get(process.env.RIOT_BASE_URL + "/summoner/v4/summoners/by-puuid/" + riotPUUID).then(res => {
              switch(res.status){
                case 200:
                  summonerId = res.data.id;
                  riotAccountId = res.data.accountId;
                  break;
                default:
                  console.log("by-puuid call with RiotPUUID: " + riotPUUID + ", Unhandled Status: " + res.status);
              }
            }).catch(err => {
              switch(err.response.status){
                case 404:
                  console.log("by-puuid call with RiotPUUID: " + riotPUUID + " does not exist.");
                  break;
                default:
                  console.log("by-puuid call with RiotPUUID: " + riotPUUID + " failed with following status: " + err.response.status);
                  next(err);
                  operationFailed = true;
                  break;
              }
            });

            if(operationFailed){
              console.log("Aborting entire upsert-riot identifiers operation during SummonerId & RiotAccountId update.");
              break;
            }

            if(summonerId && riotAccountId){
              await memberModel.updateOne({
                _id: member._id
              },{
                $set: {
                  riotPUUID: riotPUUID,
                  riotAccountId: riotAccountId,
                  summonerId: summonerId
                }
              },{
                upsert: true
              }).then(() => {
                console.log("Riot identifiers successfully updated for RiotGameName: " + member.riotGameName);
              }).catch(err => {
                console.log("Riot identifiers DB update for RiotGameName: " + member.riotGameName + " failed with following reason.");
                next(err);
                operationFailed = true;
              });
            }
          }
        }
      }
    
      console.log("Upsert riot identifiers operation is complete.");
      upsertOperation = false;
    }
  } catch(e) {
    e.trace = "Upsert-riot-identifiers operation";
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
        active: true,
        memberType: "MEMBER",
        longTermAfk: false,
        summonerId: {$exists : true}
      });
    
      for(let member of memberList){
        let operationFailed = false;
        let summonerId = member.summonerId;
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
                console.log("by-summoner call with IGN: " + member.riotGameName + ", Discord: " + member.tag + ", Unhandled Status: " + res.status);
            }
          }).catch(err => {
            switch(err.response.status){
              case 404:
                console.log("by-summoner call with IGN: " + member.riotGameName + ", Discord: " + member.tag + " does not exist.");
                break;
              default:
                console.log("by-summoner call with IGN: " + member.riotGameName + ", Discord: " + member.tag + " failed with following status: " + err.response.status);
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
              console.log("Ranks successfully updated for " + member.riotGameName + ", Discord: " + member.tag);
            }).catch(err => {
              console.log("Ranks DB update for IGN: " + member.riotGameName + ", Discord: " + member.tag + " failed with following reason.");
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

router.route("/upsert-account-info").get(async (req, res, next) => {
  try {
    if(upsertOperation){
      res.send("Upsert operation is currently in progress.");
    } else {
      upsertOperation = true;
      res.send("Upsert account info operation started.");
      memberList = await memberModel.find({
        riotPUUID: {$exists : true}
      },{
        riotPUUID: 1
      });
    
      for(let member of memberList){
        let operationFailed = false;
        let riotPUUID = member.riotPUUID;
        let gameName = "";
        let tagLine = "";
        if(riotPUUID){
          await riotHttpClient.get(process.env.RIOT_ACCOUNT_BASE_URL + "/account/v1/accounts/by-puuid/" + member.riotPUUID).then(res => {
            switch(res.status){
              case 200:
                gameName = res.data.gameName;
                tagLine = res.data.tagLine;
                break;
              default:
                console.log("by-puuid call with PUUID: " + member.PUUID + ", Unhandled Status: " + res.status);
            }
          }).catch(err => {
            switch(err.response.status){
              case 404:
                console.log("by-puuid call with PUUID: " + member.PUUID + " does not exist.");
                break;
              default:
                console.log("by-puuid call with IGN: " + member.PUUID + " failed with following status: " + err.response.status);
                next(err);
                operationFailed = true;
                break;
            }
          });
      
          if(gameName && tagLine){
            await memberModel.updateOne({
              _id: member._id
            },{
              $set: {
                riotGameName: gameName,
                riotTagLine: tagLine,
              }
            },{
              upsert: true
            }).then(() => {
              console.log("Riot gameName and tagLine successfully updated for " + gameName);
            }).catch(err => {
              console.log("Riot Account Info DB update for GameName: " + gameName + " failed with following reason.");
              next(err);
              operationFailed = true;
            });
          }
          
          if(operationFailed){
            console.log("Aborting entire upsert-account info operation during summonerId update.");
            break;
          }
        }
      }
      console.log("Upsert account info operation is complete.");
      upsertOperation = false;
    }
  } catch(e) {
    e.trace = "Upsert-account info operation";
    next(e);
  }
});

module.exports = router