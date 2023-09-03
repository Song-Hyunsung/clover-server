const express = require("express");
const memberModel = require("../models/member")

let router = express.Router();
const middleware = require('../middleware/authenticateToken');

router.route("/")
.get(middleware.authenticateToken, async (req, res) => {
  if(req.token){
    console.log("GET Member endpoint invoked by user: " + req.token.name + " at time: " + new Date());
    memberList = await memberModel.find({});
    memberListDTO = [];
  
    memberList.forEach(member => {
      const botRole = "CLOVER BOT";
      const everyoneRole = "@everyone";
      let roles = [];
      let isBot = false;
  
      member.roles.forEach(role => {
        if(role !== botRole){
          if(role !== everyoneRole){
            roles.push(role);
          }
        } else {
          isBot = true;
        }
      })
  
      if(!isBot){
        member.roles = roles;
        memberListDTO.push(member);
      }
    });
    res.json(memberListDTO);
  }
})
.post(middleware.authenticateToken, async (req, res) => {
  if(req.token){
    console.log("POST Member endpoint invoked by user: " + req.token.name + " at time: " + new Date());
    try {
      // TODO - check input has correct fields (typing in models/member.js)
      await memberModel.updateOne({
        _id: req.body.id
      },{
        $set: {
          note: req.body.note
        }
      });
      console.log("Note updated for: " + req.body.displayName + " by: " + req.token.name);
      res.status(200).send(req.body.displayName + " was successfully updated.");
    } catch(e) {
      res.status(400).send("Request payload is not in expected format.");
    }
  }
});

module.exports = router