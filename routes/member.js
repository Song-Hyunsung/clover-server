const express = require("express");
const memberModel = require("../models/member")

let router = express.Router();
const middleware = require('../middleware/authenticateToken');

router.route("/").get(middleware.authenticateToken, async (req, res) => {
  if(req.token){
    console.log("Member endpoint invoked by user: " + req.token.name + " at time: " + new Date());
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
});

module.exports = router