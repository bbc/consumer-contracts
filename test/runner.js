import nock from 'nock';
import sinon from "sinon";
import { print } from "../lib/formatter.js";
import { runner } from "../lib/runner.js";
import { validator } from '../lib/validator.js';

nock("http://api.example.com").get("/").reply(200, {
  foo: "bar",
});

nock("http://api.example2.com").get("/").reply(200, {
  foo: "bar",
});

describe('runner', () => {
  // beforeEach(() => {
  //   nock.cleanAll();
  // });

  it('prints the output from running the contract tests', async () => {

    const printSpy = sinon.spy(print);
    const validatorSpy = sinon.spy(validator);
    // const contractValidateStub = sinon.stub(Contract.prototype, 'validate').callsFake(() => ({ status: 'fulfilled', value: { foo: 'bar' }, contract: {} }));

    await runner(['test/fixtures/contract-fixture.js', 'test/fixtures/contract-fixture-2.js']);

    sinon.assert.calledOnce(validatorSpy);
    sinon.assert.calledOnce(printSpy);
    // sinon.assert(contractValidateStub.calledTwice);

  });
});