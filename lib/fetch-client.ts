import _ from "lodash";
import fetch from "node-fetch";
import { ContractCustomClient, ContractResponse } from "./contract";
import { RequestInit } from "node-fetch";

/**
 * A basic fetch client that matches the required interface to Contract.client. Use this instead of fetch directly.
 */
function getNodeFetchClient(): ContractCustomClient {
  return {
    defaults: (defaultOptions) => {
      return (options) => fetch(options.url, _.merge({}, defaultOptions, options) as unknown as RequestInit)
        .then(resp => (resp as unknown as ContractResponse));
    },
  };
}

export default getNodeFetchClient;
