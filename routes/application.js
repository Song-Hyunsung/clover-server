const express = require("express");
const applicationModel = require("../models/application")

let router = express.Router();

router.route("/")
.get((req, res) => {
  res.status(200).send("This endpoint does nothing at the moment");
})
.post(async (req, res) => {
  try {
    let application = new applicationModel({
      inGameName: req.body.inGameName,
      realName: req.body.realName,
      dateOfBirth: req.body.dateOfBirth,
      note : req.body.note
    })

    await application.save();

    console.log("Application created for: " + req.body.inGameName);
    res.status(200).send("Application for " + req.body.inGameName + " was successfully created.");
  } catch(e) {
    console.log(e);
    res.status(400).send("Error during application save");
  }
})

module.exports = router;
