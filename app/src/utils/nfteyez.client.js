
import assetSchema from '../schemas/account-asset.schema';
import metadataSchema from '../schemas/token-metadata.schema';

const axios = require('axios');
const NFT_EYEZ_BASE_URL = "https://nfteyez.global";


const client = axios.create({
  baseURL: '',
  timeout: 5000,
  responseType: 'json',
  headers: { Pragma: "no-cache" },
});


export const getAccountAssets = async (accountId, sortBy = 'authority') => {
  const path = `${NFT_EYEZ_BASE_URL}/api/accounts/${accountId}`;
  const response = await client.get(path);
  return response?.data?.map(data => assetSchema(data));
};

export const get = async (url) => {
  const response = await client.get(url);
  return response?.data?.map(data => metadataSchema(data));
}

export const post = async (url, body) => {
  const response = await client.post(url, body);
  return response;
}