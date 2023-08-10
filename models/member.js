const mongoose = require("mongoose")

const memberSchema = new mongoose.Schema({
  _id: String,
  displayName: String,
  name: String,
  roles: [String],
  tag: String,
  inGameName: String,
  isMember: Boolean,
  summonerId: String,
  active: Boolean,
  ranks: Object,
  createdAt: Date,
  joinedAt: Date,
  updatedAt: Date
});

const Member = mongoose.model('Member', memberSchema, 'member');

module.exports = Member