import { createBuilder } from "@bbc/http-transport";
import createDebug from "debug";
import Joi from "joi";
import _ from "lodash";
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

/**
 * Create a contract with a third party API. Allows for client, request and validation configuration.
 */
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
    this._options = _.merge({}, this._defaultOptions, this._request);
    this._response = options.response;

    if (options.client) {
      this._client = options.client.defaults(this._defaultOptions);
    }
    else {
      // build http transport based client
      const builder = createBuilder()
        .retries(this._options.retry || 0)
        .retryDelay(this._options.retryDelay || 0);

      const httpTransportClient = builder.createClient()
        .timeout(this._options.timeout || 0)
        .headers(this._options.headers)
        .query(this._options.query);

      this._client = async function (url, options) {
        return httpTransportClient[(this._request.method || "get").toLowerCase()](url).asResponse();
      }
    }

    this.joiOptions = _.merge({}, joiOptions, options.joiOptions || {});
  }

  /**
   * Validate your contract by fetching from the supplied endpoint and options and validating using Joi schemas.
   * @param {*} callback a callback that contains errors if there were any. Expected to be called with no arguments if the validation succeeded.
   * @returns void
   */
  async validate(callback) {
    const schema = Joi.object().keys(this._response);

    if (this.before) {
      let beforeHasErrored = false;
      this.before((val) => {
        callback(val);
        if (val instanceof Error) beforeHasErrored = true;
      });
      if (beforeHasErrored) return;
    }

    try {
      let retries = this.retries || 0;

      while (retries >= 0) {
        let clientResponse = await this._client(this._request.url, this._options);

        const resWithEvaluatedBody = {
          url: clientResponse.url,
          status: clientResponse.statusCode || clientResponse.status,
          statusText: clientResponse.statusText,
          headers: clientResponse.headers,
          body: clientResponse.body,
        };

        debug(`${resWithEvaluatedBody.url} ${resWithEvaluatedBody.status}`);

        const schemaValidationResult = schema.validate(resWithEvaluatedBody, this.joiOptions);
        if (schemaValidationResult.error) {
          if (retries > 0) {
            retries -= 1;
            continue;
          } else {
            const detail = schemaValidationResult.error.details[0];
            const path = detail.path;
            return callback(createError(detail, path, resWithEvaluatedBody));
          }
        } else {
          retries -= 1;
          continue;
        }
      }
    } catch (error) {
      callback(error);
      return;
    }

    if (this.after) {
      let afterHasErrored = false;
      this.after((val) => {
        callback(val);
        if (val instanceof Error) afterHasErrored = true;
      });
      if (afterHasErrored) return;
    }

    callback();
  }
}
