require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors')
const app = express();
const memberRoute = require("./routes/member");
const botRoute = require('./routes/bot');

let corsOptions = {
  origin : ['http://localhost:3000']
}

app.use(cors(corsOptions));

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

// Default error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

app.listen(process.env.PORT || 8080, () => console.log("Clover server running..."));