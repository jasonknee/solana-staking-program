
import './App.css';
import { useState } from 'react';
import { Connection, Transaction } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';

import * as bip39 from 'bip39';
import * as anchor from '@project-serum/anchor';
import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { tokens } from './jajang.json';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getOrCreateAssociatedTokenAccountAddress } from './util';
const { TOKEN_PROGRAM_ID, Token, AccountLayout } = require("@solana/spl-token");
const { SystemProgram, Keypair, SYSVAR_RENT_PUBKEY, PublicKey } = web3;
require('@solana/wallet-adapter-react-ui/styles.css');
// const anchor = require("@project-serum/anchor");
const wallets = [getPhantomWallet()]

const baseAccount = Keypair.generate();
const opts = {
  preflightCommitment: "processed"
}
const programID = new PublicKey(idl.metadata.address);

function App() {
  const [value, setValue] = useState('');
  const [dataList, setDataList] = useState([]);
  const [input, setInput] = useState('');
  const wallet = useWallet()

  async function getProvider() {
    /* create the provider and return it to the caller */
    /* network set to local network for now */
    const network = "https://api.devnet.solana.com"; //"http://127.0.0.1:8899";
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }

  async function initialize() {
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);

    /* PDAs */
    const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("token-seed"))],
      program.programId
    );
    const vault_account_pda = _vault_account_pda;
    const vault_account_bump = _vault_account_bump;

    const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );
    const vault_authority_pda = _vault_authority_pda;
    /* !PDAS */

    const tokenA = tokens[12];
    const tokenB = tokens[2];
    const initializerTokenAccountA = await getOrCreateAssociatedTokenAccountAddress(
      tokenA,
      provider.wallet,
      provider.connection
    );
    console.log(initializerTokenAccountA.toString());
    // const initializerTokenAccountA = new PublicKey(initializerTokenAccountAAddress);
    const initializerTokenAccountInfoA = await provider.connection.getAccountInfo(initializerTokenAccountA);
    console.log(initializerTokenAccountInfoA)




    /* */
    let associatedTokenAccountAddress;
    const mintPublicKey = new PublicKey(tokenB);
    const mintToken = new Token(
      provider.connection,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      provider.wallet
    );

    associatedTokenAccountAddress = await Token.getAssociatedTokenAddress(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      wallet.publicKey
    );

    const receiverAccount = await provider.connection.getAccountInfo(associatedTokenAccountAddress);

    if (receiverAccount === null) {
      const instruction = await Token.createAssociatedTokenAccountInstruction(
        mintToken.associatedProgramId,
        mintToken.programId,
        mintPublicKey,
        associatedTokenAccountAddress,
        provider.wallet.publicKey,
        provider.wallet.publicKey
      );

      let transaction = new Transaction({
        feePayer: provider.wallet.publicKey
      }).add(instruction);
      let { blockhash } = await provider.connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      let signed = await provider.wallet.signTransaction(transaction);
      const txid = await provider.connection.sendRawTransaction(signed.serialize());
      await provider.connection.confirmTransaction(txid);
    }




    const initializerTokenAccountB = await getOrCreateAssociatedTokenAccountAddress(
      tokenB,
      provider.wallet,
      provider.connection
    );
    // console.log(initializerTokenAccountB.toString());
    // const initializerTokenAccountInfoB = await provider.connection.getAccountInfo(initializerTokenAccountB);
    // console.log(initializerTokenAccountInfoB)

    const escrowAccount = Keypair.generate();

    /* create the program interface combining the idl, program ID, and provider */
    console.log({
      vault_account_bump: vault_account_bump,
      amountA: new anchor.BN(1),
      amountB: new anchor.BN(2),
      body: {
        accounts: {
          initializer: provider.wallet.publicKey,
          vaultAccount: vault_account_pda,
          mint: tokens[12],
          initializerDepositTokenAccount: initializerTokenAccountA,
          initializerReceiveTokenAccount: initializerTokenAccountB,
          escrowAccount: escrowAccount.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        instructions: [
          await program.account.escrowAccount.createInstruction(escrowAccount),
        ],
        signers: [escrowAccount],
      }
    });
    try {
      /* init escrow */
      await program.rpc.initializeEscrow(
        vault_account_bump,
        new anchor.BN(1),
        new anchor.BN(1),
        {
          accounts: {
            initializer: provider.wallet.publicKey,
            vaultAccount: vault_account_pda,
            mint: tokens[12],
            initializerDepositTokenAccount: initializerTokenAccountA,
            initializerReceiveTokenAccount: initializerTokenAccountB,
            escrowAccount: escrowAccount.publicKey,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          instructions: [
            await program.account.escrowAccount.createInstruction(escrowAccount),
          ],
          signers: [escrowAccount],
        }
      )
    } catch (err) {
      console.log("Transaction error: ", err);
    }

    // try {
    //   /* interact with the program via rpc */
    //   await program.rpc.initialize("Hello World", {
    //     accounts: {
    //       baseAccount: baseAccount.publicKey,
    //       user: provider.wallet.publicKey,
    //       systemProgram: SystemProgram.programId,
    //     },
    //     signers: [baseAccount]
    //   });

    //   const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    //   console.log('account: ', account);
    //   console.log(account.startTimestamp.toString());
    //   setValue(account.data.toString());
    //   setDataList(account.dataList);
    // } catch (err) {
    //   console.log("Transaction error: ", err);
    // }
  }

  async function update() {
    if (!input) return
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);
    await program.rpc.update(input, {
      accounts: {
        baseAccount: baseAccount.publicKey
      }
    });

    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    console.log('account: ', account);
    console.log(account.startTimestamp.toString());
    setValue(account.data.toString());
    setDataList(account.dataList);
    setInput('');
  }

  if (!wallet.connected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
        <WalletMultiButton />
      </div>
    )
  } else {
    return (
      <div className="App">
        <div>
          {
            !value && (<button onClick={initialize}>Initialize</button>)
          }

          {
            value ? (
              <div>
                <h2>Current value: {value}</h2>
                <input
                  placeholder="Add new data"
                  onChange={e => setInput(e.target.value)}
                  value={input}
                />
                <button onClick={update}>Add data</button>
              </div>
            ) : (
              <h3>Please Inialize.</h3>
            )
          }
          {
            dataList.map((d, i) => <h4 key={i}>{d}</h4>)
          }
        </div>
      </div>
    );
  }
}

const AppWithProvider = () => (
  <ConnectionProvider endpoint="http://127.0.0.1:8899">
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
)

export default AppWithProvider;