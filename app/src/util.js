import { web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");

export const getOrCreateAssociatedTokenAccountAddress = async (tokenMintAddress, wallet, connection) => {
  let associatedTokenAccountAddress;

  const mintPublicKey = new PublicKey(tokenMintAddress);
  const mintToken = new Token(
    connection,
    mintPublicKey,
    TOKEN_PROGRAM_ID,
    wallet
  );


  // * can fail for some reason if owner does not own the requested token
  try {
    // gets associated token account for wallet
    const tokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
      wallet.publicKey
    );
    associatedTokenAccountAddress = tokenAccount?.address;
  }
  catch (e) {
    // alternatively get associated token account for wallet
    associatedTokenAccountAddress = await Token.getAssociatedTokenAddress(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      wallet.publicKey
    );
  }

  return associatedTokenAccountAddress;
}