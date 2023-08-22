require("dotenv").config({path:"../.env"});
const express = require("express");
const axios = require("axios");
const jwt = require('jsonwebtoken');
const middleware = require('../middleware/authenticateToken');

let router = express.Router();

router.route("/check").get(middleware.authenticateToken, (req, res, next) => {
  res.status(200).send("You are authenticated.");
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
        redirect_uri: process.env.DISCORD_OAUTH2_REDIRECT_URI,
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
            if(isAdmin){
              // TODO - create JWT here and pass back
              const jwtPayload = {
                name: nick,
              }
              const accessToken = jwt.sign(jwtPayload, process.env.JWT_TOKEN_SECRET_KEY, { expiresIn: '30d'});
              console.log("Access token has been created and will be included in the response as AUTH_JWT cookie");
              res.cookie("AUTH_JWT", accessToken, {
                secure: process.env.NODE_ENV !== "DEV",
                httpOnly: true,
                expires: new Date(Date.now() + 2592000000),
              })
              res.status(200).send("Admin confirmed, access token is set");
            } else {
              res.status(403).send("This user is not an admin, unauthorized access");
            }
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