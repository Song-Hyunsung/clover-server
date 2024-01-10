require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors')
const cookieParser = require("cookie-parser");
const app = express();
const memberRoute = require("./routes/member");
const botRoute = require('./routes/bot');
const authRoute = require('./routes/auth');
const applicationRoute = require('./routes/application');

const corsOriginList = process.env.ALLOWED_ORIGINS.split(",");

app.use(cors({
  origin: corsOriginList,
  credentials: true 
}));

app.use(cookieParser());
app.use(express.json());

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

app.use("/application", applicationRoute);

// Default error handler
app.use((err, req, res, next) => {
  console.error(err);
  if(err && err.response && err.response.status && err.response.data){
    if(err.trace){
      res.status(err.response.status).send("Error reason: " + err.response.data.error + "\n" + "Trace: " + err.trace);
    } else {
      res.status(err.response.status).send("Error reason: " + err.response.data.error);
    }
  } else {
    res.status(500).send("Something broke");
  }
})

app.listen(process.env.PORT || 8080, () => console.log("Clover server running..."));