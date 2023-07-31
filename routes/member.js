const express = require("express");
const memberModel = require("../models/member")

let router = express.Router();

router.route("/").get(async (req, res) => {
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
});

module.exports = router