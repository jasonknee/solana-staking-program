
import './App.css';
import { useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';

import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { tokens } from './jajang.json';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getOrCreateAssociatedTokenAccountAddress } from './util';
const { TOKEN_PROGRAM_ID, Token, AccountLayout } = require("@solana/spl-token");
const { SystemProgram, Keypair } = web3;
require('@solana/wallet-adapter-react-ui/styles.css');

const wallets = [ getPhantomWallet() ]

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

  async function getTokenAccountOfMint(tokenMintAddress, wallet, connection) {
    console.log(wallet);
    const mintPublicKey = new web3.PublicKey(tokenMintAddress);    
    const mintToken = new Token(
      connection,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      wallet //.payer // the wallet owner will pay to transfer and to create recipients associated token account if it does not yet exist.
    );
          
    const fromTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
      wallet.publicKey
    );

    console.log(fromTokenAccount);
    return fromTokenAccount;
  }

  async function getTokenAccountOfNewToken(tokenMintAddress, wallet, connection) {
    const mintPublicKey = new web3.PublicKey(tokenMintAddress);    
    const mintToken = new Token(
      connection,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      wallet//.payer // the wallet owner will pay to transfer and to create recipients associated token account if it does not yet exist.
    );

    // Get the derived address of the destination wallet which will hold the custom token
    const associatedDestinationTokenAddr = await Token.getAssociatedTokenAddress(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      wallet.publicKey
    );

    console.log(associatedDestinationTokenAddr);
    return associatedDestinationTokenAddr;
  }

  async function initialize() {    
    const provider = await getProvider();
    
    // which token account do I want to send 
    const initializerTokenAccountA = await getOrCreateAssociatedTokenAccountAddress(tokens[4], provider.wallet, provider.connection);
    console.log(initializerTokenAccountA.toString())
    // which token account do I want to receive
    const initializerTokenAccountB = await getOrCreateAssociatedTokenAccountAddress(tokens[2], provider.wallet, provider.connection);
    console.log(initializerTokenAccountB.toString())
    // console.log(initializerTokenAccountB.toString())


    // console.log(provider.wallet)
    // const address = Token.getAssociatedTokenAddress(
    //   'associatedProgramId: PublicKey',
    //   'programId: PublicKey',
    //   'mint: PublicKey',
    //   'owner: PublicKey',
    // )
    
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);
    try {
      /* interact with the program via rpc */
      await program.rpc.initialize("Hello World", {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });

      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      console.log('account: ', account);
      console.log(account.startTimestamp.toString());
      setValue(account.data.toString());
      setDataList(account.dataList);
    } catch (err) {
      console.log("Transaction error: ", err);
    }
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
      <div style={{ display: 'flex', justifyContent: 'center', marginTop:'100px' }}>
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