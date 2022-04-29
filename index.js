import { MongoClient } from 'mongodb';
import express from 'express';
import cors from 'cors';
import Joi from 'joi';
import schema from './src/validation.js';
import dotenv from 'dotenv';

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URL);
let database = null;

app.post("/participants", async (req, res) => {
    const body  = req.body;
    const validateName = schema.validate(body);
  
    if (validateName.error) {
        res.sendStatus(422);
        return;
    }

    try {
        await mongoClient.connect();
        database = mongoClient.db("bate-papo-uol");        

        const user = await database.collection("participants").findOne(body);

        if (user) {
            res.sendStatus(409);
            return;        
        }
        mongoClient.close();
    } catch(e) {
        console.log(e);
        mongoClient.close();
    }
    res.sendStatus(201);
});

app.listen(5000);