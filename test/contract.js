const Contract = require('../lib/contract');
const Joi = require('joi');
const assert = require('chai').assert;
const nock = require('nock');
const sinon = require('sinon');

describe('Contract', () => {
  it('throws an error when the name is missing', () => {
    assert.throws(() => {
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

  it('throws an error when the consumer is missing', () => {
    assert.throws(() => {
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

  it('throws an error when the request is missing', () => {
    assert.throws(() => {
      new Contract({
        name: 'Name',
        consumer: 'Consumer',
        response: {
          statusCode: 200
        }
      });
    }, 'Invalid contract: Missing required property [request]');
  });

  it('throws an error when the response is missing', () => {
    assert.throws(() => {
      new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        }
      });
    }, 'Invalid contract: Missing required property [response]');

    it('supports passing custom Joi options', () => {
      const options = {
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
        },
        joiOptions: {
          just: 'checking'
        }
      };
      const contract = new Contract(options);

      assert.equal(contract.joiOptions.just, options.joiOptions.just);
    });
  });

  describe('.validate', () => {
    beforeEach(() => {
      nock.cleanAll();
    });

    it('does not return an error when the contract is valid', (done) => {
      nock('http://api.example.com').get('/').reply(200, {
        foo: 'bar'
      });

      const contract = new Contract({
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

    it('returns an error when the contract is broken', (done) => {
      nock('http://api.example.com').get('/').reply(200, {
        bar: 'baz'
      });

      const contract = new Contract({
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

      contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, 'Contract failed: "bar" must be a number');
        assert.equal(err.detail, 'at res.body.bar got [baz]');
        done();
      });
    });

    it('returns an error when the request fails', (done) => {
      nock('http://api.example.com').get('/').socketDelay(1000).reply(200, {});

      const contract = new Contract({
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

      contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, 'Request failed: ESOCKETTIMEDOUT');
        done();
      });
    });

    it('sets a user-agent header', (done) => {
      nock('http://api.example.com', {
        reqheaders: {
          'user-agent': 'consumer-contracts/' + require('../package').version
        }
      }).get('/').reply(200);

      const contract = new Contract({
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

    it('supports passing a custom request client', (done) => {
      nock('http://api.example.com', {
        reqheaders: {
          authorization: 'Bearer xxx',
          'user-agent': 'consumer-contracts/' + require('../package').version
        }
      }).get('/').reply(200);

      const client = require('request').defaults({
        headers: {
          authorization: 'Bearer xxx'
        }
      });

      const contract = new Contract({
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

      contract.validate((err) => {
        assert.ifError(err);
        done();
      });
    });

    it('runs the before before  validating the contact', (done) => {
      const before = sinon.stub().yields();

      nock('http://api.example.com').get('/').reply(200);

      const contract = new Contract({
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

      contract.validate((err) => {
        assert.ifError(err);
        sinon.assert.called(before);
        done();
      });
    });

    it('returns an error when the before function fails', (done) => {
      const before = sinon.stub().yields(new Error('Setup error'));

      nock('http://api.example.com').get('/').reply(200);

      const contract = new Contract({
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

      contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, 'Setup error');
        done();
      });
    });

    it('runs the after function after validating the contact', (done) => {
      const after = sinon.stub().yields();

      nock('http://api.example.com').get('/').reply(200);

      const contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200
        },
        after: after
      });

      contract.validate((err) => {
        assert.ifError(err);
        sinon.assert.called(after);
        done();
      });
    });

    it('returns an error when the after function fails', (done) => {
      const after = sinon.stub().yields(new Error('Cleanup error'));

      nock('http://api.example.com').get('/').reply(200);

      const contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200
        },
        after: after
      });

      contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, 'Cleanup error');
        done();
      });
    });

    it('applies any custom Joi options', (done) => {
      nock('http://api.example.com').get('/').reply(200, {
        bar: 'baz',
        baz: 'qux'
      });

      const contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/'
        },
        response: {
          statusCode: 200,
          body: Joi.object().keys({
            bar: Joi.string()
          })
        },
        joiOptions: {
          allowUnknown: false
        }
      });

      contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, 'Contract failed: "baz" is not allowed');
        assert.equal(err.detail, 'at res.body.baz got [qux]');
        done();
      });
    });
  });
});
