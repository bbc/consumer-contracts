import Joi from "joi";
import { Contract } from '../../lib/contract.js';

export const contract = new Contract({
  name: "Name2",
  consumer: "Consumer2",
  request: {
    url: "http://api.example2.com/",
  },
  response: {
    status: 200,
    body: Joi.object().keys({
      foo: Joi.string(),
    }),
  },
});;




