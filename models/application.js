const mongoose = require("mongoose")

const applicationSchema = new mongoose.Schema({
  inGameName: String,
  realName: String,
  dateOfBirth: String,
  tag: String,
  note: {
    joinReason: String,
    userComment: String,
    receptionist: String,
    recommender: String,
    miscNote: String
  }
});

const Application = mongoose.model('Application', applicationSchema, 'Application');

module.exports = Application