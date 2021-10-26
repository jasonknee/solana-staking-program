import { Program, Provider, web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
const { sendAndConfirmTransaction, Transaction } = web3;
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

  // const response = await mintToken.createAssociatedTokenAccount(wallet.publicKey);
    // console.log(response);
  try {
    // gets associated token account for wallet
    const tokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
      wallet.publicKey
    );
    associatedTokenAccountAddress = tokenAccount?.address;
  }
  // * can fail for some reason if owner does not own the requested token
  catch (e) {
    console.log('catch')
    console.log(e);
    // alternatively get associated token account for wallet
    associatedTokenAccountAddress = await Token.getAssociatedTokenAddress(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      wallet.publicKey
    );
    // // console.log('originally found: ' + associatedTokenAccountAddress)
      // console.log(associatedTokenAccountAddress);
    // const receiverAccount = await connection.getAccountInfo(associatedTokenAccountAddress);
    // // console.log(receiverAccount);
    // if (receiverAccount === null) {
    //   const instruction = await Token.createAssociatedTokenAccountInstruction(
    //     mintToken.associatedProgramId,
    //     mintToken.programId,
    //     mintPublicKey,
    //     associatedTokenAccountAddress,
    //     wallet.publicKey,
    //     wallet.publicKey
    //   );

    //   let signed = await wallet.signTransaction(instruction);
    //   // const transaction = new Transaction().add(instruction);
    //   const txid = await connection.sendRawTransaction(signed.serialize());
    //   await connection.confirmTransaction(txid);

    // }

  }

  return associatedTokenAccountAddress;
}