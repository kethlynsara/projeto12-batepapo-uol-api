import { MongoClient } from "mongodb";
import express from "express";
import cors from "cors";
import Joi from "joi";
import dotenv from "dotenv";
import schema from "./src/validation.js";
import dayjs from "dayjs";

const app = express();

app.use(cors());
app.use(express.json());

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URL);
let database = null;
const promise = mongoClient.connect();
promise.then(() => {
    database = mongoClient.db("bate-papo-uol");
});
promise.catch((e) => console.log(e));

app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const validateName = schema.validate({ name });

  if (validateName.error) {
    res.sendStatus(422);
    return;
  }

  try {
     const user = await database.collection("participants").findOne({ name });

    if (user) {
      res.sendStatus(409);
      return;
    } else {
      await database.collection("participants").insertOne({ name, lastStatus: Date.now() });
      await database.collection("messages").insertOne({
          from: name,
          to: "Todos",
          text: "entra na sala...",
          type: "status",
          time: dayjs().format("HH:MM:ss"),
        });
    }
  } catch (e) {
    console.log(e);
  }
  res.sendStatus(201);
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await database.collection("participants").find({}).toArray();
    res.send(participants);
  } catch (e) {
    console.log(e);
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const user = req.headers.user;
  try {
    await database.collection("messages").insertOne({
      from: user,
      to,
      text,
      type,
      time: dayjs().format("HH:MM:ss"),
    });
    res.sendStatus(201);
  } catch (e) {
    console.log("err post message", e);
  }
});

app.listen(5000);
