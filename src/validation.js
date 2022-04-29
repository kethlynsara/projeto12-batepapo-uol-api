import Joi from 'joi';

const schema = Joi.object({
    name: Joi.string().alphanum().required()
    // to: Joi.string().required(),
    // text: Joi.string().required(),
    // type: Joi.string().allow('message', 'private_message')    
});

export default schema;