import { Provider } from '@project-serum/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");

export const getOrCreateAssociatedTokenAccountAddress = async (tokenMintAddress: string, provider: Provider) => {
  let associatedTokenAccountAddress;
  const { wallet, connection } = provider;

  const mintPublicKey = new PublicKey(tokenMintAddress);
  const mintToken = new Token(
    connection,
    mintPublicKey,
    TOKEN_PROGRAM_ID,
    wallet
  );

  associatedTokenAccountAddress = await Token.getAssociatedTokenAddress(
    mintToken.associatedProgramId,
    mintToken.programId,
    mintPublicKey,
    wallet.publicKey
  );

  const receiverAccount = await connection.getAccountInfo(associatedTokenAccountAddress);
  if (receiverAccount === null) {
    const instruction = await Token.createAssociatedTokenAccountInstruction(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      associatedTokenAccountAddress,
      wallet.publicKey,
      wallet.publicKey
    );

    let transaction = new Transaction({
      feePayer: wallet.publicKey
    }).add(instruction);

    let { blockhash } = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;

    const signed = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(txid);
  }

  return associatedTokenAccountAddress;
}