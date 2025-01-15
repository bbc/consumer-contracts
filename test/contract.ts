import { assert } from "chai";
import Joi, { ValidationOptions } from "joi";
import { beforeEach, describe, it } from 'mocha';
import nock from "nock";
import sinon from "sinon";
import { Contract, ContractOptions } from "../lib/contract.js";
import fetchClient from "../lib/fetch-client.js";
const { version } = require('./../package.json');

describe("Contract", () => {
  it("throws an error when the name is missing", () => {
    assert.throws(() => {
      new Contract({
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
      } as unknown as ContractOptions);
    }, "Invalid contract: Missing required property [name]");
  });

  it("throws an error when the consumer is missing", () => {
    assert.throws(() => {
      new Contract({
        name: "Name",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
      } as unknown as ContractOptions);
    }, "Invalid contract: Missing required property [consumer]");
  });

  it("throws an error when the request is missing", () => {
    assert.throws(() => {
      new Contract({
        name: "Name",
        consumer: "Consumer",
        response: {
          status: 200,
        },
      } as unknown as ContractOptions);
    }, "Invalid contract: Missing required property [request]");
  });

  it("throws an error when the response is missing", () => {
    assert.throws(() => {
      new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
      } as unknown as ContractOptions);
    }, "Invalid contract: Missing required property [response]");

    it("supports passing custom Joi options", () => {
      const options = {
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
          body: Joi.object().keys({
            foo: Joi.string(),
          }),
        },
        joiOptions: {
          just: "checking",
        } as unknown as ValidationOptions,
      };
      const contract = new Contract(options);

      assert.equal((contract.joiOptions as any).just, (options.joiOptions as any).just);
    });
  });

  describe(".validate", () => {
    beforeEach(() => {
      nock.cleanAll();
    });

    it("does not return an error when the contract is valid", async () => {
      nock("http://api.example.com").get("/").reply(200, {
        foo: "bar",
      });

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
          body: Joi.object().keys({
            foo: Joi.string(),
          }),
        },
      });

      return contract.validate(() => { });
    });

    it("returns an error when the contract is broken", async () => {
      nock("http://api.example.com").get("/").reply(200, {
        bar: "baz",
      });

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
          body: Joi.object().keys({
            bar: Joi.number().integer(),
          }),
        },
      });

      return contract.validate((err) => {
        assert.ok(err);
        assert.equal(
          err.message,
          'Contract failed: "body.bar" must be a number',
        );
        assert.equal(err.detail, "at res.body,bar got [baz]");
      });
    });

    it("returns an error when the request fails", async () => {
      nock("http://api.example.com")
        .get("/")
        .delayConnection(2000)
        .reply(200, {});

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
          timeout: 1000,
        },
        response: {
          status: 200,
        },
      });

      return contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, "Request failed for GET http://api.example.com/: ESOCKETTIMEDOUT");
      });
    });

    it("sets a user-agent header", async () => {
      nock("http://api.example.com", {
        reqheaders: {
          "user-agent": "consumer-contracts/" + version,
        },
      })
        .get("/")
        .reply(200);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
      });

      return contract.validate(() => { });
    });

    it("supports passing a custom request client", async () => {
      nock("http://api.example.com/", {
        reqheaders: {
          authorization: "Bearer xxx",
          "user-agent": "consumer-contracts/" + version,
        },
      })
        .get("/")
        .reply(200);

      const asyncClient = fetchClient;

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
          headers: {
            authorization: "Bearer xxx",
          },
        },
        response: {
          status: 200,
        },
        asyncClient,
      });

      return contract.validate((err) => {
        assert.ifError(err);
      });
    });

    it("runs the before before validating the contact", async () => {
      const before = sinon.stub().yields();

      nock("http://api.example.com").get("/").reply(200);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        before,
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
      });

      return contract.validate((err) => {
        assert.ifError(err);
        sinon.assert.called(before);
      });
    });

    it("returns an error when the before function fails", async () => {
      const before = sinon.stub().yields(new Error("Setup error"));

      nock("http://api.example.com").get("/").reply(200);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        before,
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
      });

      return contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, "Setup error");
      });
    });

    it("runs the async before validating the contact", async () => {
      async function asyncBefore() {
        // noop
      }

      nock("http://api.example.com").get("/").reply(200);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        before: asyncBefore,
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
      });

      return contract.validate((err) => {
        assert.ifError(err);
      });
    });

    it("returns an error when the async before function fails", async () => {
      async function asyncBefore() {
        throw new Error('Before failed!')
      }

      nock("http://api.example.com").get("/").reply(200);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        before: asyncBefore,
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
      });

      return contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, "Before failed!");
      });
    });

    it("runs the after function after validating the contact", async () => {
      const after = sinon.stub().yields();

      nock("http://api.example.com").get("/").reply(200);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
        after,
      });

      return contract.validate((err) => {
        assert.ifError(err);
        sinon.assert.called(after);
      });
    });

    it("returns an error when the after function fails", async () => {
      const after = sinon.stub().yields(new Error("Cleanup error"));

      nock("http://api.example.com").get("/").reply(200);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
        after,
      });

      return contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, "Cleanup error");
      });
    });


    it("runs the async after function after validating the contact", async () => {
      async function asyncAfter() {
        // noop
      }

      nock("http://api.example.com").get("/").reply(200);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
        after: asyncAfter,
      });

      return contract.validate((err) => {
        assert.ifError(err);
      });
    });

    it("returns an error when the async after function fails", async () => {
      async function asyncAfter() {
        throw new Error("After failed!");
      }

      nock("http://api.example.com").get("/").reply(200);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
        after: asyncAfter,
      });

      return contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, "After failed!");
      });
    });

    it("does not call after function when there are validation errors", async () => {
      const after = sinon.stub().yields();

      nock("http://api.example.com").get("/").reply(500);

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
        after,
      });

      return contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, 'Contract failed: "status" must be [200]');
        sinon.assert.notCalled(after);
      });
    });

    it("applies any custom Joi options", async () => {
      nock("http://api.example.com").get("/").reply(200, {
        bar: "baz",
        baz: "qux",
      });

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
          body: Joi.object().keys({
            bar: Joi.string(),
          }),
        },
        joiOptions: {
          allowUnknown: false,
        },
      });

      return contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, 'Contract failed: "body.baz" is not allowed');
        assert.equal(err.detail, "at res.body,baz got [qux]");
      });
    });

    describe("Retry option on", () => {
      it("does not return an error when the contract is invalid on the first attempt but valid when retried", async () => {
        const responses = [
          [500, {}],
          [500, {}],
          [200, { bar: "baz" }],
        ];
        let replyCount = 0;
        nock("http://api.example.com")
          .get("/")
          .times(3)
          .reply(() => {
            replyCount++;
            return responses.shift();
          });

        const contract = new Contract({
          name: "Name",
          consumer: "Consumer",
          request: {
            url: "http://api.example.com/",
          },
          retries: 2,
          retryDelay: 0,
          response: {
            status: 200,
            body: Joi.object().keys({
              bar: Joi.string(),
            }),
          },
        });

        return contract.validate((err) => {
          assert.ifError(err);
          assert.equal(replyCount, 3);
        });
      });

      it("returns an error when the contract is invalid on initial and all retry attempts", async () => {
        const responses = [
          [500, {}],
          [500, {}],
          [500, {}],
        ];
        let replyCount = 0;
        nock("http://api.example.com")
          .get("/")
          .times(3)
          .reply(() => {
            replyCount++;
            return responses.shift();
          });

        const contract = new Contract({
          name: "Name",
          consumer: "Consumer",
          request: {
            url: "http://api.example.com/",
          },
          retries: 2,
          retryDelay: 0,
          response: {
            status: 200,
            body: Joi.object().keys({
              bar: Joi.string(),
            }),
          },
        });

        return contract.validate((err) => {
          assert.equal(replyCount, 3);
          assert.ok(err);
          assert.equal(err.message, 'Contract failed: "status" must be [200]');
          assert.equal(err.detail, "at res.status got [500]");
        });
      });

      it("waits before retrying if the retryDelay is specified", async function () {
        const mockClient = sinon.stub();
        mockClient.onFirstCall().resolves({
          status: 500,
          request: {},
          body: {},
        });

        mockClient.onSecondCall().resolves({
          status: 200,
          request: {},
          body: { bar: "baz" },
        });

        const clock = sinon.useFakeTimers();

        const contract = new Contract({
          name: "Name",
          consumer: "Consumer",
          request: {
            url: "http://api.example.com/",
          },
          retries: 1,
          retryDelay: 2000,
          response: {
            status: 200,
            body: Joi.object().keys({
              bar: Joi.string(),
            }),
          },
        });

        contract._client = mockClient;

        const contractValidation = contract.validate((err) => {
          assert.ifError(err);
          assert.equal(mockClient.callCount, 2);
        });

        assert.equal(mockClient.callCount, 1);
        await clock.tickAsync(2000);
        assert.equal(mockClient.callCount, 2);
        clock.restore();

        return contractValidation;
      });

      it('supports a custom retry function', (done) => {
        const server = nock('http://api.example.com')
          .get('/test')
          .reply(202)
          .get('/test')
          .reply(200, { success: true });

        const contract = new Contract({
          name: 'Test Contract',
          consumer: 'Test Consumer',
          request: {
            url: 'http://api.example.com/test',
            method: 'GET'
          },
          response: {
            status: 200,
            body: Joi.object().keys({
              success: Joi.boolean().valid(true)
            })
          },
          retries: {
            maxRetries: 1,
            handler: (error) => error.statusCode === 202 ? 100 : false
          }
        });

        contract.validate((err) => {
          try {
            assert.ifError(err);
            assert.ok(server.isDone());
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      it('passes retry count to retry function', (done) => {
        const server = nock('http://api.example.com')
          .get('/test')
          .times(3)
          .reply(202)
          .get('/test')
          .reply(200, { success: true });

        const retryCounts: number[] = [];

        const contract = new Contract({
          name: 'Test Contract',
          consumer: 'Test Consumer',
          request: {
            url: 'http://api.example.com/test',
            method: 'GET'
          },
          response: {
            status: 200,
            body: Joi.object().keys({
              success: Joi.boolean().valid(true)
            })
          },
          retries: {
            maxRetries: 3,
            handler: (error, request, retryCount) => {
              retryCounts.push(retryCount);
              return error.statusCode === 202 ? 10 : false;
            }
          }
        });

        contract.validate((err) => {
          try {
            assert.ifError(err);
            assert.deepEqual(retryCounts, [0, 1, 2]);
            assert.ok(server.isDone());
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      it('stops retrying when maxRetries is reached', (done) => {
        let retryCount = 0;
        const server = nock('http://api.example.com')
          .get('/test')
          .times(3)
          .reply(500);

        const contract = new Contract({
          name: 'Test Contract',
          consumer: 'Test Consumer',
          request: {
            url: 'http://api.example.com/test',
            method: 'GET'
          },
          response: {
            status: 200
          },
          retries: {
            maxRetries: 2,
            handler: (error, request, retryAttempt) => {
              retryCount++;
              return true;
            }
          }
        });

        contract.validate((err) => {
          try {
            assert.ok(err, 'Should fail after max retries');
            assert.equal(retryCount, 2, 'Should have attempted exactly maxRetries times');
            assert.ok(server.isDone(), 'Should have made initial request plus maxRetries attempts');
            done();
          } catch (error) {
            done(error);
          }
        });
      });
    });

    it('stops retrying when function returns false', (done) => {
      let retryFunctionCalls = 0;
      const server = nock('http://api.example.com')
        .get('/test')
        .reply(500);

      const contract = new Contract({
        name: 'Test Contract',
        consumer: 'Test Consumer',
        request: {
          url: 'http://api.example.com/test',
          method: 'GET'
        },
        response: {
          status: 200
        },
        retries: {
          maxRetries: 1,
          handler: (error, request, retryCount) => {
            retryFunctionCalls++;
            return false;
          }
        }
      });

      contract.validate((err) => {
        try {
          assert.ok(err);
          assert.equal(retryFunctionCalls, 1, 'Retry function should only be called once');
          assert.ok(server.isDone(), 'Server should have received exactly one request');
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});
