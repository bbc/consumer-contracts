'use strict';

const _ = require('lodash');
const async = require('async');
const debug = require('debug')('consumer-contracts');
const Joi = require('joi');

const pkg = require('../package');

const requiredOptions = [
  'name',
  'consumer',
  'request',
  'response'
];

const joiOptions = {
  allowUnknown: true,
  presence: 'required'
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

class Contract {
  constructor(options) {
    validateOptions(options);
    this.name = options.name;
    this.consumer = options.consumer;
    this.before = options.before;
    this.after = options.after;

    this._request = options.request;
    this._response = options.response;
    this._client = (options.client || require('request')).defaults({
      json: true,
      headers: {
        'user-agent': 'consumer-contracts/' + pkg.version
      }
    });

    if (options.joiOptions) {
      this.joiOptions = _.merge(joiOptions, options.joiOptions);
    }
  }

  validate(cb) {
    const schema = Joi.object().keys(this._response);
    const tasks = [];

    if (this.before) {
      tasks.push(this.before);
    }

    tasks.push((done) => {
      this._client(this._request, (err, res) => {
        if (err) return done(new Error(`Request failed: ${err.message}`));

        debug(`${res.request.method} ${res.request.href} ${res.statusCode}`);

        const result = schema.validate(res, joiOptions);
        if (result.error) {
          const detail = result.error.details[0];
          const path = detail.path;
          return done(createError(detail, path, res));
        }

        done();
      });
    });

    if (this.after) {
      tasks.push(this.after);
    }

    async.series(tasks, cb);
  }
}

module.exports = Contract;
