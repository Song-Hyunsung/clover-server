const mongoose = require("mongoose")

const memberSchema = new mongoose.Schema({
  _id: Number,
  displayName: String,
  name: String,
  roles: [String],
  tag: String,
  inGameName: String,
  isMember: Boolean,
  createdAt: Date,
  joinedAt: Date,
  updatedAt: Date
});

const Member = mongoose.model('Member', memberSchema, 'member');

module.exports = Member