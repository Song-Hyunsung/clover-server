const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const memberModel = require("../../models/member");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('non-cr-riot-tag')
    .setDescription('List of members without CR prefix on Riot Tag & Name')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction) {
    let memberList = await memberModel.find({
      $and: [
        { riotGameName: {$exists : true}},
        { riotGameName: {$not : {$regex:"CR"}}},
        { roles: {$ne: '장기 잠수'}}
      ]   
    },{
      displayName: 1,
      tag: 1,
      roles: 1,
      riotGameName: 1,
      riotTagLine: 1
    });
    let replyString = ""
    for(let member of memberList){
      replyString += member.displayName + " (" + member.riotGameName + "#" + member.riotTagLine + ")\n"
    }
    await interaction.reply(`${replyString}`);
  },
};