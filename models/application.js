const mongoose = require("mongoose")

const applicationSchema = new mongoose.Schema({
  inGameName: String,
  realName: String,
  dateOfBirth: String,
  tag: String,
  dataTransferred: Boolean,
  note: {
    joinReason: String,
    userComment: String,
    receptionist: String,
    recommender: String,
    miscNote: String
  },
  createdAt: Date,
  updatedAt: Date
});

const Application = mongoose.model('Application', applicationSchema, 'Application');

module.exports = Application