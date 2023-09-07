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
              const jwtPayload = {
                name: nick,
              }
              const accessToken = jwt.sign(jwtPayload, process.env.JWT_TOKEN_SECRET_KEY, { expiresIn: '30d'});
              console.log("Access token has been created and will be included in the response as AUTH_JWT header");
              console.log("Nickname of this user: " + nick);
              // ideally you will want this cookie, but because server and ui is on different domain (free tier limitation) cookie cannot be used in this case...
              // res.cookie("AUTH_JWT", accessToken, {
              //   secure: process.env.NODE_ENV !== "DEV",
              //   httpOnly: true,
              //   expires: new Date(Date.now() + 2592000000),
              // })
              res.set("AUTH_JWT", accessToken);
              res.set("Access-Control-Expose-Headers", "AUTH_JWT");
              res.status(200).send("Admin confirmed, access token is set");
            } else {
              console.log("User who is not admin was trying to access the site, AUTH_JWT header was not created");
              console.log("Nickname of this user: " + nick);
              res.status(403).send("This user is not an admin, unauthorized access");
            }
          }
        } catch(e){
          e.trace = "Access token exchange";
          next(e);
        }
      }
    } catch(e){
      e.trace = "Authorization code exchange";
      next(e);
    }
  } else {
    res.status(401).send("code is missing");
  }
});

module.exports = router