const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upsert-member-list')
        .setDescription('Manual export of member & tier list')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    async execute(interaction) {
        await interaction.reply(`Info: ${JSON.stringify(interaction.member.permissions)}, Admin bit is: ${PermissionFlagsBits.Administrator}`);
    },
};