require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors')
const app = express();
const memberRoute = require("./routes/member");

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

app.use("/member", memberRoute)

app.listen(8080, () => console.log("Clover server running..."));