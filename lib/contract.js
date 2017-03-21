'use strict';

const Joi = require('joi');
const util = require('util');
const debug = require('debug')('consumer-contracts');
const _ = require('lodash');
const async = require('async');
const pkg = require('../package');

const requiredOptions = [
  'name',
  'consumer',
  'request',
  'response'
];

let joiOptions = {
  allowUnknown: true,
  presence: 'required'
};

function validateOptions(options) {
  options = options || {};
  requiredOptions.forEach((key) => {
    if (!options.hasOwnProperty(key)) {
      throw new Error('Invalid contract: Missing required property [' + key + ']');
    }
  });
}

function Contract(options) {
  validateOptions(options);
  this.name = options.name;
  this.consumer = options.consumer;
  this.request = options.request;
  this.response = options.response;
  this.client = (options.client || require('request')).defaults({
    json: true,
    headers: {
      'user-agent': 'consumer-contracts/' + pkg.version
    }
  });
  this.before = options.before;
  this.after = options.after;
  if (options.joiOptions) {
    this.joiOptions = joiOptions = _.merge(joiOptions, options.joiOptions);
  }
}

Contract.prototype.validate = function (cb) {
  const schema = Joi.object().keys(this.response);
  const client = this.client;
  const request = this.request;
  const tasks = [];

  if (this.before) {
    tasks.push(this.before);
  }

  tasks.push((done) => {
    client(request, (err, res) => {
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
};

module.exports = Contract;
