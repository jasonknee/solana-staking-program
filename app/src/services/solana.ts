import { Provider } from '@project-serum/anchor';
import { Commitment, ConfirmOptions, Connection } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

const opts = {
  preflightCommitment: "processed"
}

export function getSolanaProvider(wallet: any) {
  const network = "https://api.devnet.solana.com"; //"http://127.0.0.1:8899";
  const connection = new Connection(network, opts.preflightCommitment as Commitment);

  const provider = new Provider(
    connection, wallet, opts as ConfirmOptions,
  );
  return provider;
}