import { MongoClient, ObjectId } from "mongodb";
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
    name: Joi.string().alphanum().required(),
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
      await database
        .collection("participants")
        .insertOne({ name, lastStatus: Date.now() });
      await database.collection("messages").insertOne({
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });
    }
  } catch (e) {
    console.log(e);
  }
  res.sendStatus(201);
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await database
      .collection("participants")
      .find({})
      .toArray();
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
    type: Joi.string().allow("message", "private_message"),
  });

  const validateMessage = schemaMessage.validate(
    { to, text, type },
    { abortEarly: false }
  );

  if (validateMessage.error) {
    res.sendStatus(422);
    return;
  }

  try {
    const person = await database
      .collection("participants")
      .findOne({ name: user });

    if (!person) {
      res.sendStatus(422);
      return;
    }

    await database.collection("messages").insertOne({
      from: person.name,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (e) {
    console.log(e);
  }
});

app.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  const user = req.headers.user;
  const aux = [];
  try {
    const messages = await database.collection("messages").find({}).toArray();

    for (let i = 0; i < messages.length; i++) {
      if (
        messages[i].type === "private_message" &&
        (messages[i].to === user || messages[i].from === user)
      ) {
        aux.push(messages[i]);
      }
      if (messages[i].type === "message" || messages[i].type === "status") {
        aux.push(messages[i]);
      }
    }

    if (limit) {
      const lastMessages = aux.reverse().splice(0, limit);
      res.send(lastMessages.reverse());
      return;
    } else {
      res.send(aux);
    }
  } catch (e) {
    console.log(e);
  }
});

app.post("/status", async (req, res) => {
  const user = req.headers.user;

  try {
    const participant = await database
      .collection("participants")
      .findOne({ name: user });

    if (!participant) {
      res.sendStatus(404);
      return;
    }

    await database.collection("/participants").updateOne(
      {
        name: user,
      },
      {
        $set: {
          lastStatus: Date.now(),
        },
      }
    );

    res.sendStatus(200);
  } catch (e) {
    console.log(e);
  }
});

app.delete("/messages/:id", async (req, res) => {
  const user = req.headers.user;
  const { id } = req.params;
  try {
    const message = await database
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });

    if (!message) {
      res.sendStatus(404);
      return;
    }

    if (user !== message.from) {
      res.sendStatus(401);
      return;
    }

    await database.collection("messages").deleteOne({ _id: new ObjectId(id) });
  } catch (e) {
    console.log(e);
  }
});

app.put("/messages/:id", async (req, res) => {
  const user = req.headers.user;
  const { id } = req.params;
  const { to, text, type } = req.body;

  const schema = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().allow("message", "private_message"),
  });

  const validateMessage = schema.validate(
    { to, text, type },
    { abortEarly: false }
  );

  if (validateMessage.error) {
    res.sendStatus(422);
    return;
  }

  try {
    const person = await database
      .collection("participants")
      .findOne({ name: user });

    if (!person) {
      res.sendStatus(422);
      return;
    }

    const message = await database
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });

    if (!message) {
      res.sendStatus(404);
      return;
    }

    if (user !== message.from) {
      res.sendStatus(401);
      return;
    }

    await database.collection("messages").updateOne(
      {
        _id: message._id,
      },
      { $set: { to, text, type } }
    );
  } catch (e) {
    console.log(e);
  }
});

setInterval(async () => {
  try {
    const participants = await database
      .collection("participants")
      .find({})
      .toArray();
    const updateStatus = Date.now();
    for (let i = 0; i < participants.length; i++) {
      if (updateStatus - participants[i].lastStatus > 10000) {
        await database
          .collection("participants")
          .deleteOne({ _id: new ObjectId(participants[i]._id) });
        await database.collection("messages").insertOne({
          from: participants[i].name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: dayjs().format("HH:mm:ss"),
        });
      }
    }
  } catch (e) {
    console.log(e);
  }
}, 15000);

app.listen(5000);
