var Joi = require('joi');
var util = require('util');
var debug = require('debug')('consumer-contracts');
var _ = require('lodash');
var request = require('request').defaults({
  json: true
});

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

var responseProperties = [
  'statusCode',
  'body',
  'headers'
];

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
}

Contract.prototype.validate = function (cb) {
  var schema = Joi.object().keys(this.response);
  var requestOptions = this.request;

  request(requestOptions, function (err, res) {
    if (err) return cb(new Error(util.format('Request failed: %s', err.message)));

    debug(util.format('%s %s %s', res.request.method, res.request.href, res.statusCode));

    var result = Joi.validate(_.pick(res, responseProperties), schema, joiOptions);

    if (result.error) {
      err = new Error(util.format('Contract failed: %s', result.error.details[0].message));
      err.detail = util.format('at res.%s', result.error.details[0].path);
    }

    cb(err);
  });
};

module.exports = Contract;