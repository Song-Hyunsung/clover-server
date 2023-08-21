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

router.route("/authenticate").get(async (req, res, next) => {
  const ADMIN_ROLE = "721906462749884427";
  let isAdmin = false;
  console.log(`The authorization code is: ${req.query.code}`);
  console.log("Now calling discord with authorization code for access token");

  if(req.query.code){
    try {
      let tokenResponse = await axios.post('https://discord.com/api/oauth2/token',
      {
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code: req.query.code,
        grant_type: 'authorization_code',
        redirect_uri: "http://localhost:3000/login/redirect",
        scope: 'identify'
      },
      {
        headers: {
          "Content-Type": 'application/x-www-form-urlencoded'
        }
      })

      console.log("Now calling discord with access token for user data");

      if(tokenResponse.data && tokenResponse.data.access_token){
        try {
          let userResponse = await axios.get('https://discord.com/api/users/@me/guilds/' + process.env.DISCORD_GUILD_ID + "/member", 
          {
            headers: {
              "authorization": `Bearer ${tokenResponse.data.access_token}`
            }
          })
          if(userResponse && userResponse.data){            
            const nick = userResponse.data.nick;
            const roles = userResponse.data.roles;
            
            for(let role of roles){
              if(role == ADMIN_ROLE){
                isAdmin = true;
                break;
              }
            }
          }
          if(isAdmin){
            res.status(200).send("Admin confirmed, set session");
          } else {
            res.status(403).send("This user is not an admin, unauthorized access");
          }
        } catch(e){
          console.error(e);
          next(e);
        }
      }
    } catch(e){
      // TODO - pass status and error message from axios to handler
      console.error(e);
      next(e);
    }
  } else {
    res.status(401).send("code is missing");
  }
});

module.exports = router