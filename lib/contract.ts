import { createBuilder } from "@bbc/http-transport";
import createDebug from "debug";
import Joi, { ValidationErrorItem, ValidationOptions } from "joi";
import _ from "lodash";
import { ValidationResult } from "./formatter";
const { version } = require('./../../package.json');

const debug = createDebug("consumer-contracts");

const requiredOptions = ["name", "consumer", "request", "response"];

function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const joiOptions = {
  allowUnknown: true,
  presence: "required",
};

function validateOptions(options: ContractOptions) {
  options = options || {};
  requiredOptions.forEach((key) => {
    if (!options.hasOwnProperty(key)) {
      throw new Error(`Invalid contract: Missing required property [${key}]`);
    }
  });
}

export type TransformedResponse = {
  url: string;
  status: number;
  statusCode: number;
  statusText: string;
  headers: Object;
  body: any;
};

function createError(detail: ValidationErrorItem, path: (string | number)[], res: TransformedResponse) {
  const err = new Error(`Contract failed: ${detail.message}`);
  (err as any).detail = `at res.${path} got [${_.get(res, path)}]`;

  return err;
}

type ContractRequestHeaders = Object;

type ContractRequest = {
  timeout?: number;
  headers?: ContractRequestHeaders;
  query?: Object;
  method?: string;
  json?: boolean;
  url: string;
  body?: any;
}

export type ContractResponse = {
  url: string;
  statusCode: number;
  status: number;
  statusText: string;
  headers: ContractRequestHeaders;
  body?: any;
}

export type ContractCustomClient = {
  defaults: (cr: ContractRequest) => (request: ContractRequest) => Promise<ContractResponse>;
}

export type ContractOptions = {
  request: ContractRequest;
  response: Joi.PartialSchemaMap<any> | undefined;
  name: string;
  consumer: string;
  before?: (callback: (val: any) => void) => void;
  after?: (callback: (val: any) => void) => void;
  retries?: number;
  retryDelay?: number;
  client?: ContractCustomClient;
  joiOptions?: ValidationOptions;
}

/**
 * Create a contract with a third party API. Allows for client, request and validation configuration.
 */
export class Contract {

  name: string;
  consumer: string;
  before?: (callback: (val: any) => void) => void;
  after?: (callback: (val: any) => void) => void;
  retries: number;
  retryDelay: number;
  _request: ContractRequest;
  _response: Joi.PartialSchemaMap<any> | undefined;
  _requestOptions: ContractRequest;
  _defaultRequestOptions: Partial<ContractRequest>;
  _client: (request: ContractRequest) => Promise<ContractResponse>;
  joiOptions: ValidationOptions;

  constructor(options: ContractOptions) {
    validateOptions(options);
    this.name = options.name;
    this.consumer = options.consumer;
    this.before = options.before;
    this.after = options.after;
    this.retries = options.retries || 0;
    this.retryDelay = options.retryDelay || 0;

    this._request = options.request;
    this._defaultRequestOptions = {
      json: true,
      headers: {
        "user-agent": "consumer-contracts/" + version,
      },
    };
    this._requestOptions = _.merge({}, this._defaultRequestOptions, this._request);
    this._response = options.response;

    if (options.client) {
      this._client = options.client.defaults(this._requestOptions);
    }
    else {
      // build http transport based client
      const builder = createBuilder();

      const httpTransportClient = builder.createClient()
        .timeout(this._requestOptions.timeout || 0)
        .headers(this._requestOptions.headers || {})
        .query(this._requestOptions.query || {});

      this._client = async function (request: ContractRequest) {
        return (<any>httpTransportClient)[(this._request.method || "get").toLowerCase()](request.url, request.body).asResponse();
      }
    }

    this.joiOptions = _.merge({}, joiOptions, options.joiOptions || {});
  }

  /**
   * Validate your contract by fetching from the supplied endpoint and options and validating using Joi schemas.
   * @param {*} callback a callback that contains errors if there were any. Expected to be called with no arguments if the validation succeeded.
   * @returns void
   */
  async validate(callback: (err: any, result: ValidationResult | undefined) => void) {
    const schema = Joi.object().keys(this._response);
    let schemaValidationResult;
    if (this.before) {
      let beforeHasErrored = false;
      this.before((val) => {
        callback(val, undefined);
        if (val instanceof Error) beforeHasErrored = true;
      });
      if (beforeHasErrored) return;
    }

    try {
      let retries = this.retries;

      while (retries >= 0) {
        if (retries !== this.retries && !!this.retryDelay) await timeout(this.retryDelay);

        const clientResponse = await this._client(this._request);

        const resWithEvaluatedBody: TransformedResponse = {
          url: clientResponse.url,
          status: clientResponse.statusCode || clientResponse.status,
          statusCode: clientResponse.statusCode || clientResponse.status,
          statusText: clientResponse.statusText,
          headers: clientResponse.headers,
          body: clientResponse.body,
        };

        debug(`${resWithEvaluatedBody.url} ${resWithEvaluatedBody.status}`);

        schemaValidationResult = schema.validate(resWithEvaluatedBody, this.joiOptions);
        if (schemaValidationResult.error) {
          if (retries > 0) {
            retries -= 1;
            continue;
          } else {
            const detail = schemaValidationResult.error.details[0];
            const path = detail.path;
            callback(createError(detail, path, resWithEvaluatedBody), undefined);
            return;
          }
        } else {
          retries = -1;
          continue;
        }
      }
    } catch (error) {
      callback(error, undefined);
      return;
    }

    if (this.after) {
      let afterHasErrored = false;
      this.after((val) => {
        callback(val, undefined);
        if (val instanceof Error) afterHasErrored = true;
      });
      if (afterHasErrored) return;
    }

    callback(undefined, schemaValidationResult);
  }
}
