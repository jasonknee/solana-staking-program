
import './App.css';
import { useState } from 'react';
import { Connection, Transaction } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';

import { getTokenAccountsByOwner, getTokenNftMetadata } from './utils/solana.client';
import * as anchor from '@project-serum/anchor';
import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { tokens } from './jajang.json';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getOrCreateAssociatedTokenAccountAddress } from './util';
import { get, getAccountAssets } from './utils/nfteyez.client';
import axios from 'axios';
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

let escrowAccountPubKey = '';
let selectedTokenMintAddress = '';

function App() {
  const [value, setValue] = useState('');
  const [dataList, setDataList] = useState([]);
  const [input, setInput] = useState('');
  const wallet = useWallet()
  let started = false;
  const [nfts, setNfts] = useState([]);

  function getProvider() {
    /* create the provider and return it to the caller */
    /* network set to local network for now */
    const network = "https://api.devnet.solana.com"; //"http://127.0.0.1:8899";
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }

  async function getStarted() {
    const provider = getProvider();
    const tokens = await getTokenAccountsByOwner(provider.wallet.publicKey.toString());
    console.log(tokens);

    const list = [];
    for (const token of tokens) {
      const fullToken = await getTokenNftMetadata(token.mint);
      list.push(fullToken);
      console.log(fullToken);
    }
    // tokens.forEach(async(token) => {
    //   const fullToken = await getTokenNftMetadata(token.mint);
    //   list.push(fullToken);
    //   console.log(fullToken);
    // })

    setNfts(list);
    console.log(list);
    console.log(nfts);

  }

  async function initialize(tokenA) {
    console.log(tokenA);
    selectedTokenMintAddress = tokenA;
    const provider = getProvider();
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

    // const tokenA = tokens[12];
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

    const escrowAccount = Keypair.generate();
    console.log('escrowAccountPubKey: ' + escrowAccount.publicKey.toString())
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

      console.log(escrowAccount.publicKey.toString())
      escrowAccountPubKey = escrowAccount.publicKey.toString();
      const account = await program.account.escrowAccount.fetch(escrowAccount.publicKey);
      console.log('account: ', account);
      console.log(account);
      setValue(escrowAccountPubKey);
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }

  async function cancel() {
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

    const initializerTokenAccountA = await getOrCreateAssociatedTokenAccountAddress(
      selectedTokenMintAddress,
      provider.wallet,
      provider.connection
    );
    // Cancel the escrow.
    await program.rpc.cancelEscrow({
      accounts: {
        initializer: provider.wallet.publicKey,
        initializerDepositTokenAccount: initializerTokenAccountA,
        vaultAccount: vault_account_pda,
        vaultAuthority: vault_authority_pda,
        escrowAccount: new PublicKey(escrowAccountPubKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

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

  async function stake(token) {
    console.log(token);
    await initialize(token.mint);
  }



  if (!wallet.connected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
        <WalletMultiButton />
      </div>
    )
  } else {
    return (
      <div className="App" style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
        <div className="container">
          <button className="btn btn-outline-primary mb-4" type="button" onClick={getStarted}>Refresh NFTs</button>
          {
            value?.length ? (<div>
              <button className="btn btn-secondary" onClick={cancel}>cancel</button>
            </div>) : <div></div>
          }
          <div className="row">
            {
              nfts.map((d, i) =>
                <div className="col-sm-6 col-md-4 col-lg-3 col-xl-2 mb-2" key={i}>
                  <div className="card">
                    <img src={d.data.metadata.image} className="card-img-top" alt="..." />
                    <div className="card-body">
                      <h5 className="card-title">{d.data.name}</h5>
                      <p className="card-text">{d.data.metadata?.collection?.name}</p>
                    </div>
                    <div className="card-footer">
                      <button className="btn btn-sm btn-outline-primary" onClick={async () => stake(d)}>Stake</button>
                    </div>
                  </div>
                </div>
              )
            }
          </div>
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