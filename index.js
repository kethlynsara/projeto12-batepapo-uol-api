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

app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const validateName = schema.validate({ name });

  if (validateName.error) {
    res.sendStatus(422);
    return;
  }

  try {
    await mongoClient.connect();
    database = mongoClient.db("bate-papo-uol");

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
    mongoClient.close();
  } catch (e) {
    console.log(e);
    mongoClient.close();
  }
  res.sendStatus(201);
});

app.get("/participants", async (req, res) => {
  try {
    await mongoClient.connect();
    database = mongoClient.db("bate-papo-uol");
    const participants = await database.collection("participants").find({}).toArray();
    res.send(participants);
    mongoClient.close();
  } catch (e) {
    console.log(e);
    mongoClient.close();
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const user = req.headers.user;
  try {
    await mongoClient.connect();
    database = mongoClient.db("bate-papo-uol");
    await database.collection("messages").insertOne({
      from: user,
      to,
      text,
      type,
      time: dayjs().format("HH:MM:ss"),
    });
    res.sendStatus(201);
    mongoClient.close();
  } catch (e) {
    console.log("err post message", e);
    mongoClient.close();
  }
});

app.listen(5000);
