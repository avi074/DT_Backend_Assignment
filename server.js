import express from "express";
import { MongoClient } from "mongodb";
import getEventRouter from "./events.js";

// Server Configure
const app = express();

app.listen("3000", () => {
  console.log("Server listening at port 3000");
});

app.use(express.json());

// MongoDB Configuration
const url = "mongodb://localhost:27017";
const client = new MongoClient(url);

client
  .connect()
  .then(() => {
    console.log("Connected to Mongodb!");
    const db = client.db("DT_Assignment");
    const collection = db.collection("events");
    // Router configuration
    app.use("/api/v3/app", getEventRouter(collection));
  })
  .catch((err) => {
    console.error("MongoDB connection error: ", err);
  });
