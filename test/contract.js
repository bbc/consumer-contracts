'use strict';

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
        assert.equal(err.message, 'Contract failed: "body.bar" must be a number');
        assert.equal(err.detail, 'at res.body,bar got [baz]');
        done();
      });
    });

    it('returns an error when the request fails', (done) => {
      nock('http://api.example.com').get('/').delayConnection(2000).reply(200, {});

      const contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        request: {
          url: 'http://api.example.com/',
          timeout: 1000
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
        client
      });

      contract.validate((err) => {
        assert.ifError(err);
        done();
      });
    });

    it('runs the before before validating the contact', (done) => {
      const before = sinon.stub().yields();

      nock('http://api.example.com').get('/').reply(200);

      const contract = new Contract({
        name: 'Name',
        consumer: 'Consumer',
        before,
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
        before,
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
        after
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
        after
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
        assert.equal(err.message, 'Contract failed: "body.baz" is not allowed');
        assert.equal(err.detail, 'at res.body,baz got [qux]');
        done();
      });
    });

    describe('Retry option on', () => {
      it('does not return an error when the contract is invalid on the first attempt but valid when retried', (done) => {
        const responses = [
          [500, {}],
          [500, {}],
          [200, { bar: 'baz' }]
        ];
        let replyCount = 0;
        nock('http://api.example.com').get('/').times(3).reply(() => {
          replyCount++;
          return responses.shift();
        });

        const contract = new Contract({
          name: 'Name',
          consumer: 'Consumer',
          request: {
            url: 'http://api.example.com/'
          },
          retries: 2,
          retryDelay: 0,
          response: {
            statusCode: 200,
            body: Joi.object().keys({
              bar: Joi.string()
            })
          }
        });

        contract.validate((err) => {
          assert.ifError(err);
          assert.equal(replyCount, 3);
          done();
        });
      });

      it('returns an error when the contract is invalid on initial and all retry attempts', (done) => {
        const responses = [
          [500, {}],
          [500, {}],
          [500, {}]
        ];
        let replyCount = 0;
        nock('http://api.example.com').get('/').times(3).reply(() => {
          replyCount++;
          return responses.shift();
        });

        const contract = new Contract({
          name: 'Name',
          consumer: 'Consumer',
          request: {
            url: 'http://api.example.com/'
          },
          retries: 2,
          retryDelay: 0,
          response: {
            statusCode: 200,
            body: Joi.object().keys({
              bar: Joi.string()
            })
          }
        });

        contract.validate((err) => {
          assert.equal(replyCount, 3);
          assert.ok(err);
          assert.equal(err.message, 'Contract failed: "statusCode" must be [200]');
          assert.equal(err.detail, 'at res.statusCode got [500]');
          done();
        });
      });

      it('waits before retrying if the retryDelay is specified', (done) => {
        const mockClient = sinon.stub();
        mockClient.defaults = () => {};
        mockClient.onFirstCall().yields(undefined, {
          statusCode: 500,
          request: {},
          body: {}
        });

        mockClient.onSecondCall().yields(undefined, {
          statusCode: 200,
          request: {},
          body: { bar: 'baz' }
        });

        const client = {
          defaults: () => mockClient
        };

        const clock = sinon.useFakeTimers();

        const contract = new Contract({
          name: 'Name',
          consumer: 'Consumer',
          request: {
            url: 'http://api.example.com/'
          },
          client,
          retries: 1,
          retryDelay: 2000,
          response: {
            statusCode: 200,
            body: Joi.object().keys({
              bar: Joi.string()
            })
          }
        });

        contract.validate((err) => {
          assert.ifError(err);
          assert.equal(mockClient.callCount, 2);
          done();
        });

        assert.equal(mockClient.callCount, 1);
        clock.tick(2000);
        assert.equal(mockClient.callCount, 2);
        clock.restore();
      });
    });

  });
});
