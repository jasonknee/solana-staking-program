import { Idl, Program, BN, web3, utils } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getSolanaProvider } from "../services/solana";
import { getOrCreateAssociatedTokenAccountAddress } from "../utils/token";
import { tokens } from '../jajang.json';
import idl from '../idl.json';
import { saveStakingAccount, updateStakingAccount } from '../api/staking-accounts';
import { StakingAccountStatuses, StakingAccountTokenTypes } from '../utils/constants';

const {
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY
} = web3;

const DEFAULT_TOKEN_B = tokens[6];

let programID: any;
let program: any;
let provider: any;

const init = (wallet: any = null) => {
  if (program) return;
  programID = new PublicKey(idl.metadata.address);
  provider = getSolanaProvider(wallet);
  program = new Program(idl as Idl, programID, provider);
}

export const initEscrow = async (challengeId: any, token: any, wallet: any = null) => {
  const escrowAccount = Keypair.generate();
  const mintId = token.mint;
  init(wallet);

  const initializerTokenAccountA = await getOrCreateAssociatedTokenAccountAddress(
    mintId,
    provider
  );

  const initializerTokenAccountB = await getOrCreateAssociatedTokenAccountAddress(
    DEFAULT_TOKEN_B,
    provider
  );
  
  const mintPublicKey = new PublicKey(mintId);
  const [vault_account_pda, vault_account_bump] = await PublicKey.findProgramAddress(
    [
      Buffer.from(utils.bytes.utf8.encode("the-forge")),
      mintPublicKey.toBuffer()
    ],
    program.programId
  );

  const stakingAccount = {
    walletAccountId: provider.wallet.publicKey.toString(),
    stakingAccountId: escrowAccount.publicKey.toString(),
    endedAtUnix: null,
    challengeId: challengeId,
    stakeStatusChallengeId: `${StakingAccountStatuses.STARTED}#${challengeId}`,
    type: StakingAccountTokenTypes.WEAPON,
    status: StakingAccountStatuses.STARTED,
    tokenId: mintId,
    token
  };
  await saveStakingAccount(stakingAccount);

  await program.rpc.initializeEscrow(
    vault_account_bump,
    new BN(1),
    new BN(1),
    {
      accounts: {
        initializer: provider.wallet.publicKey,
        vaultAccount: vault_account_pda,
        mint: mintId,
        initializerDepositTokenAccount: initializerTokenAccountA,
        initializerReceiveTokenAccount: initializerTokenAccountB,
        escrowAccount: escrowAccount.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY
      },
      instructions: [
        await program.account.escrowAccount.createInstruction(escrowAccount),
      ],
      signers: [escrowAccount],
    }
  )
  

  // let _escrowAccount = await program.account.escrowAccount.fetch(
  //   escrowAccount.publicKey.toString()
  // );
  
  await updateStakingAccount(
    provider.wallet.publicKey.toString(), 
    escrowAccount.publicKey.toString(), 
    StakingAccountStatuses.STAKE_REQUESTED
  );

  return stakingAccount;
};

export const cancelEscrow = async (escrowAccountId: string, token: string, wallet: any = null) => {
  init(wallet); 

  const initializerTokenAccountA = await getOrCreateAssociatedTokenAccountAddress(
    token,
    provider
  );

  /* PDAs */
  const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
    [
      Buffer.from(utils.bytes.utf8.encode("the-forge")),
      new PublicKey(token).toBuffer()
    ],
    program.programId
  );
  const vault_account_pda = _vault_account_pda;
  const vault_account_bump = _vault_account_bump;

  const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(utils.bytes.utf8.encode("escrow"))],
    program.programId
  );
  const vault_authority_pda = _vault_authority_pda;
  /* !PDAS */

  let _escrowAccount = await program.account.escrowAccount.fetch(
    escrowAccountId
  );
  console.log(_escrowAccount.startedAtTimestamp.toNumber());


  // Cancel the escrow.
  await program.rpc.cancelEscrow({
    accounts: {
      initializer: provider.wallet.publicKey,
      initializerDepositTokenAccount: initializerTokenAccountA,
      vaultAccount: vault_account_pda,
      vaultAuthority: vault_authority_pda,
      escrowAccount: new PublicKey(escrowAccountId),
      tokenProgram: TOKEN_PROGRAM_ID,
    }
  });

  await updateStakingAccount(provider.wallet.publicKey.toString(), escrowAccountId, StakingAccountStatuses.UNSTAKE_REQUESTED);


}

