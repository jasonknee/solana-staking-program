
import './forge.css';
import './App.css';
import React, { useState } from 'react';

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
  const [stakedItems, setStakedItems] = useState([]);
  const [selectedStakingAccount, selectStakingAccount] = useState();

  async function refreshNfts() {
    const tokens = await getTokenAccountsByOwner(wallet.publicKey.toString());

    const list = [];
    for (const token of tokens) {
      const fullToken = await getTokenNftMetadata(token.mint);
      list.push(fullToken);
    }
    console.log(list);
    setNfts(list);

  }

  async function loadActiveStakingAccount() {
    const stakingAccounts = await getStakingAccountsForChallengeByStatus(
      wallet.publicKey.toString(),
      DEFAULT_CHALLENGE_ID,
      StakingAccountStatuses.STARTED
    );

    await refreshNfts();
    if (stakingAccounts?.length)
      setStakedItems(stakingAccounts);

  }

  async function stake(token) {
    console.log(token);
    const stakingAccount = await initEscrow(DEFAULT_CHALLENGE_ID, token, wallet);
    setStakedItems([
      ...stakedItems,
      stakingAccount
    ]);
    console.log(token);
    const updatedNfts = nfts.filter(nft => nft.mint != token.mint);
    console.log(updatedNfts)
    setNfts(updatedNfts);
  }

  async function cancel() {
    const {
      stakingAccountId,
      tokenId,
      token
    } = selectedStakingAccount;
    await cancelEscrow(stakingAccountId, tokenId, wallet);
    console.log(stakedItems);
    console.log(tokenId);
    setStakedItems(stakedItems.filter(account => account.tokenId != tokenId));
    setNfts([ ...nfts, token])
    selectStakingAccount(null);
  }

  async function selectStakedToken(stakingAccount) {
    selectStakingAccount(stakingAccount);
    console.log(stakingAccount);
  }

  return (
    <React.Fragment>
      <img src="https://i.imgur.com/NLMkIzR.png" className="bg-image" />
      <div className="masthead">
        <div className="masthead-content text-white">
          <div className="container-fluid px-4 px-lg-0">
            <h1 className="fst-italic lh-1 mb-2">The Forge</h1>
            <p className="mb-4">Select your Weapon</p>
            <button className="btn btn-outline-light btn-lg w-100 mb-4 rounded-0" type="button" onClick={loadActiveStakingAccount}>RELOAD</button>

            {
              !wallet.connected ?
                (
                  <WalletMultiButton />
                )
                :
                (
                  <div className="container px-0">

                    <div className="row">
                      <h3>Wallet</h3>
                      {
                        nfts.map((d, i) =>
                          <div className="col-sm-6 pl-0 cursor-pointer" key={i} onClick={async () => stake(d)}>
                            <img src={d.data.metadata.image} className="card-img-top mb-3" alt="..." />
                          </div>
                        )
                      }
                    </div>
                    <h3 className="mt-5">Staked</h3>
                    <div className="row">
                      {
                        stakedItems?.length ? (
                          stakedItems?.map((item, i) =>
                            <div className="col-sm-6 pl-0 cursor-pointer" key={i} onClick={async () => selectStakedToken(item)}>
                              <img src={item?.token?.data?.metadata?.image} className="card-img-top mb-3" alt="..." />
                            </div>)
                        ) : <></>
                      }
                    </div>
                    {
                      stakedItems?.length ? (<div>
                        <button className={"btn btn-block w-100 btn-lg my-4 rounded-0 " + (selectedStakingAccount ? 'btn-light' : 'btn-outline-light')} onClick={cancel} disabled={!selectedStakingAccount}>Unstake</button>
                      </div>) : <> </>
                    }
                  </div>
                )
            }
          </div>
        </div>
      </div>
    </React.Fragment>
  )

  // if (!wallet.connected) {
  //   return (
  //     <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
  //       <WalletMultiButton />
  //     </div>
  //   )
  // } else {
  //   return (
  //     <div className="App" style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
  //       <div className="container">
  //         {
  //           !currentToken ? (<button className="btn btn-outline-primary mb-4" type="button" onClick={loadActiveStakingAccount}>SYNC</button>) :
  //             (<div className="col-2 card">
  //               <img src={currentToken.data.metadata.image} className="card-img-top" alt="..." />
  //               <div className="card-body">
  //                 <h5 className="card-title">{currentToken.data.name}</h5>
  //                 <p className="card-text">{currentToken.data.metadata?.collection?.name}</p>
  //               </div>
  //               {/* <div className="card-footer">
  //                 <button className="btn btn-sm btn-outline-primary" onClick={async () => stake(d)}>Stake</button>
  //               </div> */}
  //             </div>)
  //         }
  //         {
  //           value?.length ? (<div>
  //             <button className="btn btn-danger" onClick={cancel}>cancel</button>
  //           </div>) :
  //             <div className="row">
  //               {
  //                 nfts.map((d, i) =>
  //                   <div className="col-sm-6 col-md-4 col-lg-3 col-xl-2 mb-2" key={i}>
  //                     <div className="card">
  //                       <img src={d.data.metadata.image} className="card-img-top" alt="..." />
  //                       <div className="card-body">
  //                         <h5 className="card-title">{d.data.name}</h5>
  //                         <p className="card-text">{d.data.metadata?.collection?.name}</p>
  //                       </div>
  //                       <div className="card-footer">
  //                         <button className="btn btn-sm btn-outline-primary" onClick={async () => stake(d)}>Stake</button>
  //                       </div>
  //                     </div>
  //                   </div>
  //                 )
  //               }
  //             </div>
  //         }
  //       </div>
  //     </div>
  //   );
  // }
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