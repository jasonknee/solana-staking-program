import axios, { AxiosRequestConfig } from "axios";

const MAINNET_URL = `http://localhost:8899`;
const DEFAULT_AXIOS_CONFIG = {
  url: MAINNET_URL,
  method: "post",
  headers: { "Content-Type": "application/json" }
}
const DEFAULT_SOL_DATA_CONFIG = {
  jsonrpc: "2.0",
  id: 1
}
const JSON_ENCODING_CONFIG = { encoding: "jsonParsed" };
const BASE64_ENCODING_CONFIG = { encoding: "base64" };


export const getAccountInfo = async (publicKey: string) => {

  const response: any = await axios({
    ...DEFAULT_AXIOS_CONFIG,
    data: {
      ...DEFAULT_SOL_DATA_CONFIG,
      method: "getAccountInfo",
      params: [
        publicKey,
        JSON_ENCODING_CONFIG
      ],
    },
  } as AxiosRequestConfig);

  console.log(response);
  return response.data;
}