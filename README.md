<h1 align="center">
  <img width="550" src="https://rawgit.com/bbc/consumer-contracts/master/logo.svg" alt="Consumer Contracts">
</h1>

[![Build Status](https://travis-ci.org/bbc/consumer-contracts.svg)](https://travis-ci.org/bbc/consumer-contracts) [![Code Climate](https://codeclimate.com/github/bbc/consumer-contracts/badges/gpa.svg)](https://codeclimate.com/github/bbc/consumer-contracts) [![Test Coverage](https://codeclimate.com/github/bbc/consumer-contracts/badges/coverage.svg)](https://codeclimate.com/github/bbc/consumer-contracts/coverage)

> Consumer-driven contracts in JavaScript

[Consumer-driven contracts](http://martinfowler.com/articles/consumerDrivenContracts.html) let you move fast _without_ breaking things.

API consumers codify their expections of your service in an executable _contract_. This defines the type of response that they expect for a given request. Contracts give you an insight into which parts of your API clients depend on, and which parts can be changed without fear of breaking them.

This project lets you write executable contracts in JavaScript. It uses [request](https://github.com/request/request) to make HTTP requests and [Joi](https://github.com/hapijs/joi) to validate API responses. Contracts are defined as JavaScript modules in a `contracts` directory at the root of your project and can be executed using the `consumer-contracts` tool.

* [Getting started](#getting-started)
* [Anatomy of a contract](#anatomy-of-a-contract)
* [CLI](#cli)

## Getting started

Install the `consumer-contracts` tool globally:

```
npm install --global consumer-contracts
```

Install the `consumer-contracts` module locally (this gives you access to the contract definition interface in your contract files):

```
npm install --save-dev consumer-contracts
```

Create a `contracts` directory at the root of your project:

```
mkdir contracts
```

Create a JavaScript file within the `contracts` directory for your first contract. The example below is a contract for the GitHub User API, we'll call it `user-api.js`. In this example, the consumer depends on the `login`, `name` and `public_repos` properties returned in the response body.

```js
var Contract = require('consumer-contracts').Contract;
var Joi = require('consumer-contracts').Joi;

module.exports = new Contract({
  name: 'User API',
  consumer: 'My GitHub Service',
  request: {
    method: 'GET',
    url: 'https://api.github.com/users/robinjmurphy'
  },
  response: {
    statusCode: 200,
    body: Joi.object().keys({
      login: Joi.string(),
      name: Joi.string(),
      public_repos: Joi.number().integer()
    })
  }
});
```

To validate the contract, run the following command at the root of your project directory:

```
consumer-contracts run
```

You should see that the contract validates:

```


  ✓ My GitHub Service – User API


  1 passing


```

## Anatomy of a contract

Each contract contains four required properties; `consumer`, `name`, `request` and `response`.

```js
var Contract = require('consumer-contracts').Contract;
var Joi = require('consumer-contracts').Joi;

module.exports = new Contract({
  name: 'Contract name',
  consumer: 'Consumer name',
  request: {
    // ...
  },
  response: {
    // ...
  }
});
```

### `consumer`

The `consumer` property appears in the output of the `consumer-contracts` tool and should be the name of the consuming service that the contract applies to.

### `name`

The `name` property appears in the output of the `consumer-contracts` tool and helps you identify each individual contract.

### `request`

The `request` property defines the HTTP request that the contract applies to. All of the [options supported by request](https://github.com/request/request#requestoptions-callback) are valid. This means you can specify headers and SSL configuration options (among other things) for a given request:

```js
request: {
  method: 'GET',
  url: 'https://exmaple.com/users/fred',
  headers: {
    Accept: 'text/xml'
  },
  pfx: fs.readFileSync('/path/to/my/cert.p12'),
  passphrase: 'my-cert-passphrase'
}
```

When running under certain environments you may receive SSL errors regarding a CA file. If you know that strict trust checking is not required in this situation you may set `strictSSL: false` on the above request object, which should resolve the issue.

### `response`

The `response` object validates the response returned by your service. The entire object is treated as a [Joi](https://github.com/hapijs/joi) schema that validates the `res` object returned by `request`. This means that the response's status code, headers and JSON body can all be validated using Joi's flexible schema language. The following options are passed to Joi's [`validate()`](https://github.com/hapijs/joi#validatevalue-schema-options-callback) function:

```js
{
  allowUnknown: true,
  presence: 'required'
}
```

This means that any fields you choose to validate are _required_ by default. To indicate that a field is optional, use the [`optional()`](https://github.com/hapijs/joi#anyoptional) modifier.

#### Validating the response code

To require a specific HTTP status code, set the `statusCode` property to that value:

```js
response: {
  statusCode: 200
}
```

To allow a range of different status codes, you can use Joi's [`valid()`](https://github.com/hapijs/joi#anyvalidvalue---aliases-only-equal) function:

```js
response: {
  statusCode: Joi.any().valid(200, 201, 202)
}
```

#### Validating the response headers

The response headers can be validated using a Joi schema:

```js
response: {
  headers: Joi.object().keys({
    'Location': Joi.string().regex(/\/users\/\d+/),
    'Content-Type': 'application/json'
  })
}
```

#### Validating the response body

The response body can be validated using a Joi schema:

```js
response: {
  body: Joi.object().keys({
    name: Joi.string(),
    items: Joi.array().items(Joi.object().keys({
      id: Joi.number.integer()
    }))
  })
}
```

### `client` _optional_

You can use a pre-configured [request](https://github.com/request/request) client for your contracts using the `client` property. This can be useful when you have a set of common request options across contracts.

```js
var Contract = require('consumer-contracts').Contract;
var Joi = require('consumer-contracts').Joi;
var client = require('request').defaults({
  headers: {
    authorization: 'Bearer xxx'
  }
});

module.exports = new Contract({
  name: 'Contract name',
  consumer: 'Consumer name',
  request: {
    // ...
  },
  response: {
    // ...
  },
  client: client
});
```

### `before` _optional_

If your contract requires some setup (e.g. populating an API with data) you can use the `before` property. It takes a function that will be run before the contract executes. The setup function receives a callback argument that you should call once your setup is complete.

```js
module.exports = new Contract({
  name: 'Contract name',
  consumer: 'Consumer name',
  before: function (done) {
    // ... setup
    done();
  },
  request: {
    // ...
  },
  response: {
    // ...
  }
});
```

## CLI

### `run`

To validate all of the contracts in the `contracts` directory, type:

```
consumer-contracts run
```

This works recursively, which means you can keep the contracts for each of your consumers in a separate subdirectory.

To run a single contract, pass a filename to the `run` command:

```
consumer-contracts run ./contracts/consumer-a/contract-1.js
```
