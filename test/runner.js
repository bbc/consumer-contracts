import sinon from "sinon";
import { runner } from "../lib/runner.js";
import { print } from "../lib/formatter.js";
import nock from 'nock';

describe('runner', () => {
  // beforeEach(() => {
  //   nock.cleanAll();
  // });
  nock("http://api.example.com").get("/").reply(200, {
    foo: "bar",
  });

  it.only('prints the output from running the contract tests', () => {
    const printSpy = sinon.spy(print)

    runner(['test/fixtures/contract-fixture.js'])

    sinon.assert.calledWith(printSpy, '')
  });
});