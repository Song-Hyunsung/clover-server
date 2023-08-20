require("dotenv").config({path:"../.env"});
const express = require("express");
const axios = require("axios");

let router = express.Router();

router.route("/check").get((req, res, next) => {
  res.status(401).send("you are not logged in");
})

router.route("/check-200").get((req, res, next) => {
  res.status(200).send("you are logged in");
})

router.route("/redirect").get((req, res, next) => {
  console.log(`The authorization code is: ${req.query.code}`);
  console.log("Now calling discord with authorization code for access token");

  let axiosInstance = axios.create({
    headers: {
      "Content-Type": 'application/x-www-form-urlencoded'
    }
  })

  if(req.query.code){
    axiosInstance.post('https://discord.com/api/oauth2/token', {
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      code: req.query.code,
      grant_type: 'authorization_code',
      redirect_uri: "http://localhost:8080/auth/redirect",
      scope: 'identify'
    }).then(res => {
      console.log("authorization code was sent");
      console.log(res.data);
    }).catch(err => {
      console.log(err);
      next(err);
    })
  }
});

router.route("/token").get((req, res, next) => {
  console.log(`The access token is: ${req.query.access_token}`);
  console.log("Now calling discord with access token for user data");

  if(req.query.access_token){
    let axiosInstance = axios.create({
      headers: {
        "authorization": `Bearer ${req.query.access_token}`
      }
    })

    axiosInstance.get('https://discord.com/api/users/@me/guilds/' + process.env.DISCORD_GUILD_ID + "/member").then(res => {
      console.log(res.data);
    }).catch(err => {
      console.log(err);
      next(err);
    });
  }
})

module.exports = router