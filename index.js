import { MongoClient } from "mongodb";
import express from "express";
import cors from "cors";
import Joi from "joi";
import dotenv from "dotenv";
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

  const schemaName = Joi.object({
    name: Joi.string().alphanum().required()
  });

  const validateName = schemaName.validate({ name });

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

  const schemaMessage = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().allow('message', 'private_message') 
  });

  const validateMessage = schemaMessage.validate({to, text, type}, { abortEarly: false });

  if (validateMessage.error) {
    res.sendStatus(422);
    return;
  }

  try {
    const person = await database.collection("participants").findOne({name: user});
    
    if (!person) {
      res.sendStatus(422);
      return;
    }

    await database.collection("messages").insertOne({
      from: person.name,
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

app.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  console.log(limit)
  try {
    const messages = await database.collection("messages").find({}).toArray();
    if (limit) {
      const lastMessages = messages.slice(-limit);
      res.send(lastMessages);
      return;
    } else {
      res.send(messages); 
    }
  } catch(e) {
    console.log("erro ao buscar msgs", e);
  }
})

app.listen(5000);