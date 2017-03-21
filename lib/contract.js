'use strict';

const _ = require('lodash');
const async = require('async');
const debug = require('debug')('consumer-contracts');
const pkg = require('../package');
const util = require('util');
const Joi = require('joi');

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

        debug(util.format('%s %s %s', res.request.method, res.request.href, res.statusCode));

        const result = Joi.validate(res, schema, joiOptions);
        let path;
        let detail;

        if (result.error) {
          detail = result.error.details[0];
          path = detail.path;
          err = new Error(`Contract failed: ${detail.message}`);
          err.detail = `at res.${path} got [${_.get(res, path)}]`;
        }

        done(err);
      });
    });

    if (this.after) {
      tasks.push(this.after);
    }

    async.series(tasks, cb);
  }
}

module.exports = Contract;
