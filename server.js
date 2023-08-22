require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors')
const app = express();
const memberRoute = require("./routes/member");
const botRoute = require('./routes/bot');
const authRoute = require('./routes/auth');

app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true 
}));

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
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

app.listen(process.env.PORT || 8080, () => console.log("Clover server running..."));