
import './App.css';
import { useState } from 'react';

import { getTokenAccountsByOwner, getTokenNftMetadata } from './services/solana.client';
import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cancelEscrow, initEscrow } from './api-smart-contracts/escrow';
import { getStakingAccountsForChallengeByStatus } from './api/staking-accounts';
import { StakingAccountStatuses } from './utils/constants';
require('@solana/wallet-adapter-react-ui/styles.css');
const wallets = [getPhantomWallet()];

const DEFAULT_CHALLENGE_ID = `875b3973-2b6e-4d91-a293-f1b40356a3c7`;

function App() {
  const [currentToken, setCurrentToken] = useState();
  const [value, setValue] = useState('');
  const wallet = useWallet()
  const [nfts, setNfts] = useState([]);

  async function refreshNfts() {
    const tokens = await getTokenAccountsByOwner(wallet.publicKey.toString());

    const list = [];
    for (const token of tokens) {
      const fullToken = await getTokenNftMetadata(token.mint);
      list.push(fullToken);
    }
    setNfts(list);

  }

  async function loadActiveStakingAccount() {
    const [stakingAccount] = await getStakingAccountsForChallengeByStatus(
      wallet.publicKey.toString(),
      DEFAULT_CHALLENGE_ID,
      StakingAccountStatuses.INITIALIZED
    );

    console.log(stakingAccount);
    if (!stakingAccount) {
      await refreshNfts();
    } else {
      setCurrentToken(stakingAccount.token);
      setValue(stakingAccount.stakingAccountId);
    }

  }

  async function stake(token) {
    const escrowAccount = await initEscrow(DEFAULT_CHALLENGE_ID, token, wallet);
    setCurrentToken(token);
    setValue(escrowAccount.publicKey.toString());
  }

  async function cancel() {
    await cancelEscrow(value, currentToken.mint, wallet);
    setCurrentToken(null);
    setValue(null);
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
          {
            !currentToken ? (<button className="btn btn-outline-primary mb-4" type="button" onClick={loadActiveStakingAccount}>SYNC</button>) :
              (<div className="col-2 card">
                <img src={currentToken.data.metadata.image} className="card-img-top" alt="..." />
                <div className="card-body">
                  <h5 className="card-title">{currentToken.data.name}</h5>
                  <p className="card-text">{currentToken.data.metadata?.collection?.name}</p>
                </div>
                {/* <div className="card-footer">
                  <button className="btn btn-sm btn-outline-primary" onClick={async () => stake(d)}>Stake</button>
                </div> */}
              </div>)
          }
          {
            value?.length ? (<div>
              <button className="btn btn-danger" onClick={cancel}>cancel</button>
            </div>) :
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