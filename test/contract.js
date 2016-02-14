var Contract = require('../lib/contract');
var Joi = require('joi');
var assert = require('chai').assert;
var nock = require('nock');
var sinon = require('sinon');

describe('Contract', function () {
  it('throws an error when the name is missing', function () {
    assert.throws(function () {
      new Contract({
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200
        }
      });
    }, 'Invalid contract: Missing required property [name]');
  });

  it('throws an error when the consumer is missing', function () {
    assert.throws(function () {
      new Contract({
        name: 'Name',
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200
        }
      });
    }, 'Invalid contract: Missing required property [consumer]');
  });

  it('throws an error when the request is missing', function () {
    assert.throws(function () {
      new Contract({
        name: 'Name',
        consumer: 'Consumer',
        response: {
          statusCode: 200
        }
      });
    }, 'Invalid contract: Missing required property [request]');
  });

  it('throws an error when the response is missing', function () {
    assert.throws(function () {
      new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        }
      });
    }, 'Invalid contract: Missing required property [response]');
  });

  describe('.validate', function () {
    it('does not return an error when the contract is valid', function (done) {
      nock('http://api.example.com').get('/').reply(200, {
        foo: 'bar'
      });

      var contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200,
          body: Joi.object().keys({
            foo: Joi.string()
          })
        }
      });

      contract.validate(done);
    });

    it('returns an error when the contract is broken', function (done) {
      nock('http://api.example.com').get('/').reply(200, {
        bar: 'baz'
      });

      var contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200,
          body: Joi.object().keys({
            bar: Joi.number().integer()
          })
        }
      });

      contract.validate(function (err) {
        assert.ok(err);
        assert.equal(err.message, 'Contract failed: "bar" must be a number');
        assert.equal(err.detail, 'at res.body.bar got [baz]');
        done();
      });
    });

    it('returns an error when the request fails', function (done) {
      nock('http://api.example.com').get('/').socketDelay(1000).reply(200, {});

      var contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/',
          timeout: 1
        },
        response: {
          statusCode: 200
        }
      });

      contract.validate(function (err) {
        assert.ok(err);
        assert.equal(err.message, 'Request failed: ESOCKETTIMEDOUT');
        done();
      });
    });

    it('sets a user-agent header', function (done) {
      nock('http://api.example.com', {
        reqheaders: {
          'user-agent': 'consumer-contracts/' + require('../package').version
        }
      }).get('/').reply(200);

      var contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200
        }
      });

      contract.validate(done);
    });

    it('supports passing a custom request client', function (done) {
      nock('http://api.example.com', {
        reqheaders: {
          authorization: 'Bearer xxx',
          'user-agent': 'consumer-contracts/' + require('../package').version
        }
      }).get('/').reply(200);

      var client = require('request').defaults({
        headers: {
          authorization: 'Bearer xxx'
        }
      });

      var contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200
        },
        client: client
      });

      contract.validate(function (err) {
        assert.ifError(err);
        done();
      });
    });

    it('runs the before function before validating the contact', function (done) {
      var before = sinon.stub().yields();

      nock('http://api.example.com').get('/').reply(200);

      var contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        before: before,
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200
        }
      });

      contract.validate(function (err) {
        assert.ifError(err);
        sinon.assert.called(before);
        done();
      });
    });

    it('returns an error when the before function fails', function (done) {
      var before = sinon.stub().yields(new Error('Setup error'));

      nock('http://api.example.com').get('/').reply(200);

      var contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        before: before,
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200
        }
      });

      contract.validate(function (err) {
        assert.ok(err);
        assert.equal(err.message, 'Setup error');
        done();
      });
    });
  });
});
