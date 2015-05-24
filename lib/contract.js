var Joi = require('joi');
var util = require('util');
var debug = require('debug')('consumer-contracts');
var _ = require('lodash');
var package = require('../package');
var request = require('request').defaults({
  json: true,
  headers: {
    'user-agent': 'consumer-contracts/' + package.version
  }
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

  request(this.request, function (err, res) {
    if (err) return cb(new Error(util.format('Request failed: %s', err.message)));

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

    cb(err);
  });
};

module.exports = Contract;