var Joi = require('joi');
var util = require('util');
var debug = require('debug')('consumer-contracts');
var _ = require('lodash');
var async = require('async');
var package = require('../package');

var requiredOptions = [
  'name',
  'consumer',
  'request',
  'response'
];

var joiOptions = {
  allowUnknown: true,
  presence: 'required'
};

function validateOptions(options) {
  options = options || {};
  requiredOptions.forEach(function (key) {
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
      'user-agent': 'consumer-contracts/' + package.version
    }
  });
  this.before = options.before;
  this.after = options.after;
}

Contract.prototype.validate = function (cb) {
  var schema = Joi.object().keys(this.response);
  var client = this.client;
  var request = this.request;
  var tasks = [];

  if (this.before) {
    tasks.push(this.before);
  }

  tasks.push(function (done) {
    client(request, function (err, res) {
      if (err) return done(new Error(util.format('Request failed: %s', err.message)));

      debug(util.format('%s %s %s', res.request.method, res.request.href, res.statusCode));

      var result = Joi.validate(res, schema, joiOptions);
      var path;
      var detail;

      if (result.error) {
        detail = result.error.details[0];
        path = detail.path;
        err = new Error(util.format('Contract failed: %s', detail.message));
        err.detail = util.format('at res.%s got [%s]', path, _.get(res, path));
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
