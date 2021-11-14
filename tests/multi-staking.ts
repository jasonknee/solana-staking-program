import * as anchor from "@project-serum/anchor";
import {
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { assert } from "chai";
import { DateTime, Interval } from 'luxon';

describe("multiStaking", () => {
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow;

  let mintA = null;
  let mintB = null;
  let mintC = null;
  let mintDummy = null;

  let initializerTokenAccountA = null;
  let initializerTokenAccountB = null;
  let initializerTokenAccountC = null;
  let initializerTokenAccountDummy = null;

  let vault_account_pda_a = null;
  let vault_account_bump_a = null;
  let vault_account_pda_b = null;
  let vault_account_bump_b = null;
  let vault_account_pda_c = null;
  let vault_account_bump_c = null;
  let vault_authority_pda = null;

  const amount = 1;

  const escrowAccountTokenA = anchor.web3.Keypair.generate();
  const escrowAccountTokenB = anchor.web3.Keypair.generate();
  const escrowAccountTokenC = anchor.web3.Keypair.generate();

  const payer = anchor.web3.Keypair.generate();
  const mintAuthority = anchor.web3.Keypair.generate();
  const initializerMainAccount = anchor.web3.Keypair.generate();
  const takerMainAccount = anchor.web3.Keypair.generate();

  it("Init Tokens A, B, C", async () => {
    // Airdropping tokens to a payer.
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 10000000000),
      "confirmed"
    );

    // Fund Main Accounts
    await provider.send(
      (() => {
        const tx = new Transaction();
        tx.add(
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: initializerMainAccount.publicKey,
            lamports: 1000000000,
          }),
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: takerMainAccount.publicKey,
            lamports: 1000000000,
          })
        );
        return tx;
      })(),
      [payer]
    );

    mintA = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );

    mintB = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );

    mintC = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );

    mintDummy = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );

    initializerTokenAccountA = await mintA.createAccount(initializerMainAccount.publicKey);

    initializerTokenAccountB = await mintB.createAccount(initializerMainAccount.publicKey);

    initializerTokenAccountC = await mintC.createAccount(initializerMainAccount.publicKey);

    initializerTokenAccountDummy = await mintDummy.createAccount(initializerMainAccount.publicKey);


    await mintA.mintTo(
      initializerTokenAccountA,
      mintAuthority.publicKey,
      [mintAuthority],
      amount
    );

    await mintB.mintTo(
      initializerTokenAccountB,
      mintAuthority.publicKey,
      [mintAuthority],
      amount
    );

    await mintC.mintTo(
      initializerTokenAccountC,
      mintAuthority.publicKey,
      [mintAuthority],
      amount
    );

    await mintDummy.mintTo(
      initializerTokenAccountDummy,
      mintAuthority.publicKey,
      [mintAuthority],
      amount
    );

    let _initializerTokenAccountA = await mintA.getAccountInfo(initializerTokenAccountA);
    let _initializerTokenAccountC = await mintC.getAccountInfo(initializerTokenAccountC);
    let _initializerTokenAccountDummy = await mintDummy.getAccountInfo(initializerTokenAccountDummy);

    assert.ok(_initializerTokenAccountA.amount.toNumber() == amount);
    assert.ok(_initializerTokenAccountC.amount.toNumber() == amount);
    assert.ok(_initializerTokenAccountDummy.amount.toNumber() == amount);
  });

  it("Stake A", async () => {
    const earlier = DateTime.utc();
    const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("the-forge")),
        mintA.publicKey.toBuffer()
      ],
      program.programId
    );
    vault_account_pda_a = _vault_account_pda;
    vault_account_bump_a = _vault_account_bump;

    const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    await program.rpc.initializeEscrow(
      vault_account_bump_a,
      new anchor.BN(amount),
      new anchor.BN(amount),
      {
        accounts: {
          initializer: initializerMainAccount.publicKey,
          vaultAccount: vault_account_pda_a,
          mint: mintA.publicKey,
          initializerDepositTokenAccount: initializerTokenAccountA,
          initializerReceiveTokenAccount: initializerTokenAccountDummy,
          escrowAccount: escrowAccountTokenA.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
        },
        instructions: [
          await program.account.escrowAccount.createInstruction(escrowAccountTokenA),
        ],
        signers: [escrowAccountTokenA, initializerMainAccount],
      }
    );

    let _vault = await mintA.getAccountInfo(vault_account_pda_a);

    let _escrowAccount = await program.account.escrowAccount.fetch(
      escrowAccountTokenA.publicKey
    );

    
    const escrowStartedAt = DateTime.fromSeconds(_escrowAccount.startedAtTimestamp.toNumber());
    // Check that the new owner is the PDA.
    assert.ok(_vault.owner.equals(vault_authority_pda));

    // Check that the values in the escrow account match what we expect.
    assert.ok(_escrowAccount.initializerKey.equals(initializerMainAccount.publicKey));
    assert.ok(_escrowAccount.initializerAmount.toNumber() == amount);
    assert.ok(_escrowAccount.takerAmount.toNumber() == amount);
    assert.ok(
      _escrowAccount.initializerDepositTokenAccount.equals(initializerTokenAccountA)
    );
    assert.ok(
      _escrowAccount.initializerReceiveTokenAccount.equals(initializerTokenAccountDummy)
    );
    assert.ok(earlier >= escrowStartedAt);

    const diff = Interval.fromDateTimes(escrowStartedAt, earlier);
    const diffSeconds = diff.length('seconds');
    assert.ok(60 >= diffSeconds)
    assert.ok(escrowStartedAt <=  DateTime.utc().plus({ minutes: 1}));
  });

  it("Stake B", async () => {

    const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("the-forge")),
        mintB.publicKey.toBuffer()
      ],
      program.programId
    );
    vault_account_pda_b = _vault_account_pda;
    vault_account_bump_b = _vault_account_bump;

    const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    await program.rpc.initializeEscrow(
      vault_account_bump_b,
      new anchor.BN(amount),
      new anchor.BN(amount),
      {
        accounts: {
          initializer: initializerMainAccount.publicKey,
          vaultAccount: vault_account_pda_b,
          mint: mintB.publicKey,
          initializerDepositTokenAccount: initializerTokenAccountB,
          initializerReceiveTokenAccount: initializerTokenAccountDummy,
          escrowAccount: escrowAccountTokenB.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
        },
        instructions: [
          await program.account.escrowAccount.createInstruction(escrowAccountTokenB),
        ],
        signers: [escrowAccountTokenB, initializerMainAccount],
      }
    );

    let _vault = await mintB.getAccountInfo(vault_account_pda_b);

    let _escrowAccount = await program.account.escrowAccount.fetch(
      escrowAccountTokenB.publicKey
    );

    // Check that the new owner is the PDA.
    assert.ok(_vault.owner.equals(vault_authority_pda));

    // Check that the values in the escrow account match what we expect.
    assert.ok(_escrowAccount.initializerKey.equals(initializerMainAccount.publicKey));
    assert.ok(_escrowAccount.initializerAmount.toNumber() == amount);
    assert.ok(_escrowAccount.takerAmount.toNumber() == amount);
    assert.ok(
      _escrowAccount.initializerDepositTokenAccount.equals(initializerTokenAccountB)
    );
    assert.ok(
      _escrowAccount.initializerReceiveTokenAccount.equals(initializerTokenAccountDummy)
    );
  });


  it("Unstake A", async () => {

    // Cancel the escrow.
    await program.rpc.cancelEscrow({
      accounts: {
        initializer: initializerMainAccount.publicKey,
        initializerDepositTokenAccount: initializerTokenAccountA,
        vaultAccount: vault_account_pda_a,
        vaultAuthority: vault_authority_pda,
        escrowAccount: escrowAccountTokenA.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [initializerMainAccount]
    });

    // TODO: Assert if the PDA token account is closed

    // Check the final owner should be the provider public key.
    const _initializerTokenAccountA = await mintA.getAccountInfo(initializerTokenAccountA);
    assert.ok(_initializerTokenAccountA.owner.equals(initializerMainAccount.publicKey));

    // Check all the funds are still there.
    assert.ok(_initializerTokenAccountA.amount.toNumber() == amount);
  });


  it("Stake C", async () => {

    const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("the-forge")),
        mintC.publicKey.toBuffer()
      ],
      program.programId
    );
    vault_account_pda_c = _vault_account_pda;
    vault_account_bump_c = _vault_account_bump;

    const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    await program.rpc.initializeEscrow(
      vault_account_bump_c,
      new anchor.BN(amount),
      new anchor.BN(amount),
      {
        accounts: {
          initializer: initializerMainAccount.publicKey,
          vaultAccount: vault_account_pda_c,
          mint: mintC.publicKey,
          initializerDepositTokenAccount: initializerTokenAccountC,
          initializerReceiveTokenAccount: initializerTokenAccountDummy,
          escrowAccount: escrowAccountTokenC.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
        },
        instructions: [
          await program.account.escrowAccount.createInstruction(escrowAccountTokenC),
        ],
        signers: [escrowAccountTokenC, initializerMainAccount],
      }
    );

    let _vault = await mintC.getAccountInfo(vault_account_pda_c);

    let _escrowAccount = await program.account.escrowAccount.fetch(
      escrowAccountTokenC.publicKey
    );

    // Check that the new owner is the PDA.
    assert.ok(_vault.owner.equals(vault_authority_pda));

    // Check that the values in the escrow account match what we expect.
    assert.ok(_escrowAccount.initializerKey.equals(initializerMainAccount.publicKey));
    assert.ok(_escrowAccount.initializerAmount.toNumber() == amount);
    assert.ok(_escrowAccount.takerAmount.toNumber() == amount);
    assert.ok(
      _escrowAccount.initializerDepositTokenAccount.equals(initializerTokenAccountC)
    );
    assert.ok(
      _escrowAccount.initializerReceiveTokenAccount.equals(initializerTokenAccountDummy)
    );
  });


  it("Stake A", async () => {

    const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode("the-forge")),
        mintA.publicKey.toBuffer()
      ],
      program.programId
    );
    vault_account_pda_a = _vault_account_pda;
    vault_account_bump_a = _vault_account_bump;

    const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    await program.rpc.initializeEscrow(
      vault_account_bump_a,
      new anchor.BN(amount),
      new anchor.BN(amount),
      {
        accounts: {
          initializer: initializerMainAccount.publicKey,
          vaultAccount: vault_account_pda_a,
          mint: mintA.publicKey,
          initializerDepositTokenAccount: initializerTokenAccountA,
          initializerReceiveTokenAccount: initializerTokenAccountDummy,
          escrowAccount: escrowAccountTokenA.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
        },
        instructions: [
          await program.account.escrowAccount.createInstruction(escrowAccountTokenA),
        ],
        signers: [escrowAccountTokenA, initializerMainAccount],
      }
    );

    let _vault = await mintA.getAccountInfo(vault_account_pda_a);

    let _escrowAccount = await program.account.escrowAccount.fetch(
      escrowAccountTokenA.publicKey
    );

    // Check that the new owner is the PDA.
    assert.ok(_vault.owner.equals(vault_authority_pda));

    // Check that the values in the escrow account match what we expect.
    assert.ok(_escrowAccount.initializerKey.equals(initializerMainAccount.publicKey));
    assert.ok(_escrowAccount.initializerAmount.toNumber() == amount);
    assert.ok(_escrowAccount.takerAmount.toNumber() == amount);
    assert.ok(
      _escrowAccount.initializerDepositTokenAccount.equals(initializerTokenAccountA)
    );
    assert.ok(
      _escrowAccount.initializerReceiveTokenAccount.equals(initializerTokenAccountDummy)
    );
  });



  it("Unstake A", async () => {

    // Cancel the escrow.
    await program.rpc.cancelEscrow({
      accounts: {
        initializer: initializerMainAccount.publicKey,
        initializerDepositTokenAccount: initializerTokenAccountA,
        vaultAccount: vault_account_pda_a,
        vaultAuthority: vault_authority_pda,
        escrowAccount: escrowAccountTokenA.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [initializerMainAccount]
    });

    // TODO: Assert if the PDA token account is closed

    // Check the final owner should be the provider public key.
    const _initializerTokenAccountA = await mintA.getAccountInfo(initializerTokenAccountA);
    assert.ok(_initializerTokenAccountA.owner.equals(initializerMainAccount.publicKey));

    // Check all the funds are still there.
    assert.ok(_initializerTokenAccountA.amount.toNumber() == amount);
  });



  it("Unstake B", async () => {

    // Cancel the escrow.
    await program.rpc.cancelEscrow({
      accounts: {
        initializer: initializerMainAccount.publicKey,
        initializerDepositTokenAccount: initializerTokenAccountB,
        vaultAccount: vault_account_pda_b,
        vaultAuthority: vault_authority_pda,
        escrowAccount: escrowAccountTokenB.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [initializerMainAccount]
    });

    // TODO: Assert if the PDA token account is closed

    // Check the final owner should be the provider public key.
    const _initializerTokenAccountB = await mintB.getAccountInfo(initializerTokenAccountB);
    assert.ok(_initializerTokenAccountB.owner.equals(initializerMainAccount.publicKey));

    // Check all the funds are still there.
    assert.ok(_initializerTokenAccountB.amount.toNumber() == amount);
  });

  it("Unstake C", async () => {

    // Cancel the escrow.
    await program.rpc.cancelEscrow({
      accounts: {
        initializer: initializerMainAccount.publicKey,
        initializerDepositTokenAccount: initializerTokenAccountC,
        vaultAccount: vault_account_pda_c,
        vaultAuthority: vault_authority_pda,
        escrowAccount: escrowAccountTokenC.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [initializerMainAccount]
    });

    // TODO: Assert if the PDA token account is closed

    // Check the final owner should be the provider public key.
    const _initializerTokenAccountC = await mintC.getAccountInfo(initializerTokenAccountC);
    assert.ok(_initializerTokenAccountC.owner.equals(initializerMainAccount.publicKey));

    // Check all the funds are still there.
    assert.ok(_initializerTokenAccountC.amount.toNumber() == amount);
  });
});