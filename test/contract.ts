import { assert } from "chai";
import Joi, { ValidationOptions } from "joi";
import { beforeEach, describe, it } from 'mocha';
import nock from "nock";
import sinon from "sinon";
import { Contract, ContractOptions } from "../lib/contract.js";
import fetchClient from "../lib/fetch-client.js";
const { version } = require('./../../package.json');

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
    });
  });
});
