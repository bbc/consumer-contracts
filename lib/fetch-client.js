import _ from "lodash";
import fetch from "node-fetch";

/**
 * A basic fetch client that matches the required interface to Contract.client. Use this instead of fetch directly.
 */
function getNodeFetchClient() {
  return {
    defaults: (defaultOptions) => {
      return (options) => fetch(options.url, _.merge({}, defaultOptions, options));
    },
  };
}

export default getNodeFetchClient;
