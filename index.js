import { MongoClient } from 'mongodb';
import express from 'express';
import cors from 'cors';
import Joi from 'joi';
import schema from './src/validation.js';

const app = express();

app.use(cors());
app.use(express.json());

app.post("/participants", (req, res) => {
    const body  = req.body;
    const validateName = schema.validate(body);
  
    if (validateName.error) {
        res.sendStatus(422);
        return;
    }
});

app.listen(5000, () => console.log("it's on"));