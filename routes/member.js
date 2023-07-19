const express = require("express");
const memberModel = require("../models/member")

let router = express.Router();

router.route("/")
    .get(async (req, res) => {
        memberList = await memberModel.find({});
        res.json(memberList);
    })
    .post((req, res) => {

    })

module.exports = router