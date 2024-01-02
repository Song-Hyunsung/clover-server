const mongoose = require("mongoose")

const memberSchema = new mongoose.Schema({
  _id: String,
  displayName: String,
  name: String,
  roles: [String],
  tag: String,
  memberType: String,
  summonerId: String,
  riotAccountId: String,
  riotPUUID: String,
  riotGameName: String,
  riotTagLine: String,
  active: Boolean,
  ranks: Object,
  note: {
    joinReason: String,
    userComment: String,
    receptionist: String,
    recommender: String,
    miscNote: String
  },
  createdAt: Date,
  joinedAt: Date,
  updatedAt: Date
});

const Member = mongoose.model('Member', memberSchema, 'member');

module.exports = Member