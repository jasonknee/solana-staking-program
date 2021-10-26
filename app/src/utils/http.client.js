
import metadataSchema from '../schemas/token-metadata.schema';

const axios = require('axios');


const client = axios.create({
  baseURL: '',
  timeout: 5000,
  responseType: 'json',
  headers: { Pragma: "no-cache" },
});

export const get = async (url) => {
  const response = await client.get(url);
  return response?.data?.map(data => metadataSchema(data));
}

export const post = async (url, body) => {
  const response = await client.post(url, body);
  return response;
}