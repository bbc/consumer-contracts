import Joi from "joi";
import { assert } from "chai";
import nock from "nock";
import sinon from "sinon";
import fetch from "node-fetch";

import { Contract } from "../lib/contract.js";
import pkg from "../package.json" with { type: "json" };

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
      });
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
      });
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
      });
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
      });
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
        },
      };
      const contract = new Contract(options);

      assert.equal(contract.joiOptions.just, options.joiOptions.just);
    });
  });

  describe(".validate", () => {
    beforeEach(() => {
      nock.cleanAll();
    });

    it("does not return an error when the contract is valid", async (done) => {
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

      await contract.validate(done);
    });

    it("returns an error when the contract is broken", async (done) => {
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

      await contract.validate((err) => {
        assert.ok(err);
        assert.equal(
          err.message,
          'Contract failed: "body.bar" must be a number',
        );
        assert.equal(err.detail, "at res.body,bar got [baz]");
        done();
      });
    });

    it("returns an error when the request fails", async (done) => {
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

      await contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, "Request failed: ESOCKETTIMEDOUT");
        done();
      });
    });

    it("sets a user-agent header", async (done) => {
      nock("http://api.example.com", {
        reqheaders: {
          "user-agent": "consumer-contracts/" + pkg.version,
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

      await contract.validate(done);
    });

    it("supports passing a custom request client", async (done) => {
      nock("http://api.example.com", {
        reqheaders: {
          authorization: "Bearer xxx",
          "user-agent": "consumer-contracts/" + pkg.version,
        },
      })
        .get("/")
        .reply(200);

      const client = fetch({
        headers: {
          authorization: "Bearer xxx",
        },
      });

      const contract = new Contract({
        name: "Name",
        consumer: "Consumer",
        request: {
          url: "http://api.example.com/",
        },
        response: {
          status: 200,
        },
        client,
      });

      await contract.validate((err) => {
        assert.ifError(err);
        done();
      });
    });

    it("runs the before before validating the contact", async (done) => {
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

      await contract.validate((err) => {
        assert.ifError(err);
        sinon.assert.called(before);
        done();
      });
    });

    it("returns an error when the before function fails", async (done) => {
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

      await contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, "Setup error");
        done();
      });
    });

    it("runs the after function after validating the contact", async (done) => {
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

      await contract.validate((err) => {
        assert.ifError(err);
        sinon.assert.called(after);
        done();
      });
    });

    it("returns an error when the after function fails", async (done) => {
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

      await contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, "Cleanup error");
        done();
      });
    });

    it("applies any custom Joi options", async (done) => {
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

      await contract.validate((err) => {
        assert.ok(err);
        assert.equal(err.message, 'Contract failed: "body.baz" is not allowed');
        assert.equal(err.detail, "at res.body,baz got [qux]");
        done();
      });
    });

    describe("Retry option on", () => {
      it("does not return an error when the contract is invalid on the first attempt but valid when retried", async (done) => {
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

        await contract.validate((err) => {
          assert.ifError(err);
          assert.equal(replyCount, 3);
          done();
        });
      });

      it("returns an error when the contract is invalid on initial and all retry attempts", async (done) => {
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

        await contract.validate((err) => {
          assert.equal(replyCount, 3);
          assert.ok(err);
          assert.equal(err.message, 'Contract failed: "status" must be [200]');
          assert.equal(err.detail, "at res.status got [500]");
          done();
        });
      });

      it("waits before retrying if the retryDelay is specified", async (done) => {
        const mockClient = sinon.stub();
        mockClient.defaults = () => {};
        mockClient.onFirstCall().yields(undefined, {
          status: 500,
          request: {},
          body: {},
        });

        mockClient.onSecondCall().yields(undefined, {
          status: 200,
          request: {},
          body: { bar: "baz" },
        });

        const client = {
          defaults: () => mockClient,
        };

        const clock = sinon.useFakeTimers();

        const contract = new Contract({
          name: "Name",
          consumer: "Consumer",
          request: {
            url: "http://api.example.com/",
          },
          client,
          retries: 1,
          retryDelay: 2000,
          response: {
            status: 200,
            body: Joi.object().keys({
              bar: Joi.string(),
            }),
          },
        });

        await contract.validate((err) => {
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
