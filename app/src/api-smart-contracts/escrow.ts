import { Idl, Program, BN, web3, utils } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getSolanaProvider } from "../services/solana";
import { getOrCreateAssociatedTokenAccountAddress } from "../utils/token";
import { tokens } from '../jajang.json';
import idl from '../idl.json';
import { saveStakingAccount } from '../api/staking-accounts';
import { StakingAccountStatuses, StakingAccountTokenTypes } from '../utils/constants';
const {
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  PublicKey
} = web3;

const DEFAULT_TOKEN_B = tokens[6];

let programID: any;
let escrowAccount: any;
let program: any;
let provider: any;

const init = (wallet: any = null) => {
  if (program) return;
  programID = new PublicKey(idl.metadata.address);
  escrowAccount = Keypair.generate();
  provider = getSolanaProvider(wallet);
  program = new Program(idl as Idl, programID, provider);
}

export const initEscrow = async (challengeId: any, token: any, wallet: any = null) => {
  const mintId = token.mint;
  init(wallet);

  const [vault_account_pda, vault_account_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(utils.bytes.utf8.encode("token-seed"))],
    program.programId
  );

  const initializerTokenAccountA = await getOrCreateAssociatedTokenAccountAddress(
    mintId,
    provider
  );

  const initializerTokenAccountB = await getOrCreateAssociatedTokenAccountAddress(
    DEFAULT_TOKEN_B,
    provider
  );

  await saveStakingAccount({
    walletAccountId: provider.wallet.publicKey.toString(),
    stakingAccountId: escrowAccount.publicKey.toString(),
    startedAtUnix:  new Date().getTime(),
    endedAtUnix: null,
    challengeId: challengeId,
    stakeStatusChallengeId: `${StakingAccountStatuses.INITIALIZED}#${challengeId}`,
    type: StakingAccountTokenTypes.WEAPON,
    status: StakingAccountStatuses.INITIALIZED,
    tokenId: mintId,
    token
  });

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
      },
      instructions: [
        await program.account.escrowAccount.createInstruction(escrowAccount),
      ],
      signers: [escrowAccount],
    }
  )
  
  console.log(escrowAccount.publicKey.toString());
  return escrowAccount;
};

export const cancelEscrow = async (escrowAccountId: string, token: string, wallet: any = null) => {
  init(wallet); 

  /* PDAs */
  const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(utils.bytes.utf8.encode("token-seed"))],
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

  const initializerTokenAccountA = await getOrCreateAssociatedTokenAccountAddress(
    token,
    provider
  );
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
}
