import fetch, { RequestInit } from "node-fetch";
import { ContractCustomAsyncClient, ContractRequest, ContractResponse } from "./contract";

/**
 * A basic fetch client that matches the required interface to Contract.asyncClient. Use this instead of fetch directly.
 */
const fetchAsyncClientInterface: ContractCustomAsyncClient = {
  get: async (url: string, request: ContractRequest) => {
    return fetch(request.url, request as unknown as RequestInit) as unknown as ContractResponse;
  },
  post: async (url: string, body: any, request: ContractRequest) => {
    return fetch(request.url, request as unknown as RequestInit) as unknown as ContractResponse;
  },
  patch: async (url: string, body: any, request: ContractRequest) => {
    return fetch(request.url, request as unknown as RequestInit) as unknown as ContractResponse;
  },
  put: async (url: string, body: any, request: ContractRequest) => {
    return fetch(request.url, request as unknown as RequestInit) as unknown as ContractResponse;
  },
  delete: async (url: string, request: ContractRequest) => {
    return fetch(request.url, request as unknown as RequestInit) as unknown as ContractResponse;
  },
}

export default fetchAsyncClientInterface;
