# Clover Backend Server
Clover backend server is simple, lightweight node.js server using express.js framework to interconnect Discord and League of Legend account information into one place.

![image](https://github.com/Song-Hyunsung/clover-server/assets/36865751/b3ed81ad-9797-4047-b238-c8319e3420ff)

## Basic functionalities of Clover server
- Turn on/off Clover Management Discord Bot (integrated within the server using discord.js).
- Get every member information from Clover Discord via Bot and upsert records into database.
- For every Clover member existing in the database, query and upsert their League of Legends account rank information by calling Riot API.
- Simple GET/POST endpoint for fetching and updating member's information on the Clover member management website.
- Application matching process to take new applications from Google Form to be matched with corresponding Discord information.
- Authentication & Authorization by using Discord OAuth2 flow to only allow Clover admins to access protected endpoints.
