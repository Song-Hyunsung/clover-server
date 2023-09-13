const mongoose = require("mongoose")

const memberSchema = new mongoose.Schema({
  _id: String,
  displayName: String,
  name: String,
  roles: [String],
  tag: String,
  inGameName: String,
  memberType: String,
  hasCRPrefix: Boolean,
  summonerId: String,
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