require("dotenv").config({path:"../.env"});

const axios = require("axios").create({
  headers: {
    "X-Riot-Token": process.env.RIOT_API_KEY
  }
});

const get = async (url) => {
  await new Promise(resolve => setTimeout(resolve, process.env.RIOT_RATE_LIMIT_MS));
  return axios.get(url);
}

module.exports = {
  get: get
}