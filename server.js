require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors')
const cookieParser = require("cookie-parser");
const app = express();
const memberRoute = require("./routes/member");
const botRoute = require('./routes/bot');
const authRoute = require('./routes/auth');

app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true 
}));

app.use(cookieParser());

mongoose.connect(
  process.env.MONGODB_URL,
  {
      useNewUrlParser: true,
      useUnifiedTopology: true
  }
);

app.get("/health", (req, res) => {
  res.send("Server is online, DB readyState is " + mongoose.connection.readyState);
})

app.use("/bot", botRoute);

app.use("/member", memberRoute);

app.use("/auth", authRoute);

// Default error handler
app.use((err, req, res, next) => {
  if(err && err.response && err.response.status && err.response.data){
    res.status(err.response.status).send("Error reason: " + err.response.data.error);
  } else {
    res.status(500).send("Something broke");
  }
})

app.listen(process.env.PORT || 8080, () => console.log("Clover server running..."));