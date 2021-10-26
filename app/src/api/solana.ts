import axios, { AxiosRequestConfig } from "axios";
import { PublicKey } from '@solana/web3.js'
import { decodeMetadata } from "../utils/metadata.deserializer";

const MAINNET_URL = `https://api.devnet.solana.com`;
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
const DEFAULT_SPL_TOKEN_PROGRAMID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const METADATA_PUBKEY = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const buildTokensSchema = (result: any) => {
  const {
    info: {
      mint,
      tokenAmount: {
        amount,
        decimals
      }
    }
  } = result?.account?.data?.parsed;
  return {
    id: mint,
    mint,
    amount,
    decimals
  };
}

export const getTokenAccountsByOwner = async (walletAddress: string, mint = null) => {
  const method = "getTokenAccountsByOwner";
  const tokenParams = mint ? { mint } : { programId: DEFAULT_SPL_TOKEN_PROGRAMID };
  const { data }: any = await axios({
    ...DEFAULT_AXIOS_CONFIG,
    data: {
      ...DEFAULT_SOL_DATA_CONFIG,
      method,
      params: [
        walletAddress,
        tokenParams,
        JSON_ENCODING_CONFIG
      ],
    },
  } as AxiosRequestConfig);

  if (data.error) {
    return data.error.message;
  }

  const results = data?.result?.value ?? [];
  return results
    .map((result: any) => buildTokensSchema(result))
    .filter((token: any) => token.amount > 0 && token.decimals === 0);
};

const fetchMetadata = async (uri: string) => {
  const response = await axios({
    url: uri,
    method: "get",
    headers: { "Content-Type": "application/json" }
  });
  return response?.data;
}

export const getTokenNftMetadata = async (mint: string) => {
  const method = "getAccountInfo";
  const mintPublicKey = new PublicKey(mint);

  let [pda, bump] = await PublicKey.findProgramAddress([
    Buffer.from("metadata"),
    METADATA_PUBKEY.toBuffer(),
    new PublicKey(mintPublicKey).toBuffer(),
  ], METADATA_PUBKEY);

  const { data }: any = await axios({
    ...DEFAULT_AXIOS_CONFIG,
    data: {
      ...DEFAULT_SOL_DATA_CONFIG,
      method,
      params: [
        pda.toBase58(),
        BASE64_ENCODING_CONFIG
      ],
    },
  } as AxiosRequestConfig);

  let buf = Buffer.from(data.result.value.data[0], 'base64')
  let m = decodeMetadata(buf)
  const metadata = await fetchMetadata(m.data.uri);

  return {
    ...m,
    data: {
      ...m.data,
      metadata
    }
  }
}