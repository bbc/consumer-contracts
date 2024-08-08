import { Contract } from '../../lib/contract.js';
import Joi from "joi";

export const contract = new Contract({
  name: "Name",
  consumer: "Consumer",
  request: {
    url: "http://api.example.com/",
  },
  response: {
    status: 200,
    body: Joi.object().keys({
      foo: Joi.string(),
    }),
  },
});;


