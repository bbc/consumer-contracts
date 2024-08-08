// TODO: Transition all files to TypeScript
// TODO: Get rid of lodash
import createDebug from "debug";
import _ from "lodash";
// TODO: Replace Joi with Zod
import Joi from "joi";
// TODO: This should be native fetch but nock doesn't intercept it
import fetch from "node-fetch";

import pkg from "../package.json" with { type: "json" };

const debug = createDebug("consumer-contracts");

const requiredOptions = ["name", "consumer", "request", "response"];

const joiOptions = {
  allowUnknown: true,
  presence: "required",
};

function validateOptions(options) {
  options = options || {};
  requiredOptions.forEach((key) => {
    if (!options.hasOwnProperty(key)) {
      throw new Error(`Invalid contract: Missing required property [${key}]`);
    }
  });
}

function createError(detail, path, res) {
  const err = new Error(`Contract failed: ${detail.message}`);
  err.detail = `at res.${path} got [${_.get(res, path)}]`;

  return err;
}

export class Contract {
  constructor(options) {
    validateOptions(options);
    this.name = options.name;
    this.consumer = options.consumer;
    this.before = options.before;
    this.after = options.after;
    this.retries = options.retries || 0;
    this.retryDelay = options.retryDelay || 0;

    this._request = options.request;
    this._defaultOptions = {
      json: true,
      headers: {
        "user-agent": "consumer-contracts/" + pkg.version,
      },
    };
    this._response = options.response;
    this._client = options.client || fetch;

    this.joiOptions = _.merge({}, joiOptions, options.joiOptions || {});
  }


  async validate(cb) {
    const schema = Joi.object().keys(this._response);
    const tasks = [];

    if (this.before) {
      tasks.push(this.before);
    }

    const self = this;
    async function makeRequest(done, retries, retryDelay) {
      const options = _.merge({}, self._defaultOptions, self._request);
      // TODO: This should be using this._client, but it's not working
      return fetch(self._request.url, options)
        .then(async (res) => {
          const json = await res.json();
          const resWithJsonBody = {
            url: res.url,
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            body: json,
          };
          return resWithJsonBody;
        })
        .then((res) => {
          debug(`${res.url} ${res.status}`);
          const result = schema.validate(res, self.joiOptions);
          if (result.error) {
            if (retries > 0) {
              setTimeout(async () => {
                await makeRequest(done, --retries, retryDelay);
              }, retryDelay);
            } else {
              const detail = result.error.details[0];
              const path = detail.path;
              return done(createError(detail, path, res));
            }
          } else {
            return done();
          }
        })
        .catch((err) => {
          return done(err);
        });
    }

    tasks.push(makeRequest(cb, self.retries, self.retryDelay));

    if (this.after) {
      tasks.push(this.after);
    }

    const results = await Promise.allSettled(tasks);

    if (cb) cb(null,);
  }
}

