const assert = require("assert");
const anchor = require("@project-serum/anchor");
const { SystemProgram } = anchor.web3;

describe("mysolanaapp", () => {
  /* create and set a Provider */
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Mysolanaapp;
  it("Creates a counter)", async () => {
    /* Call the create function via RPC */
    const escrowAccount = anchor.web3.Keypair.generate();
    await program.rpc.create({
      accounts: {
        escrowAccount: escrowAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [escrowAccount],
    });

    /* Fetch the account and check the value of count */
    const account = await program.account.escrowAccount.fetch(escrowAccount.publicKey);
    console.log('Count 0: ', account.expectedAmount.toString())
    assert.ok(account.count.toString() == 0);
    _escrowAccount = escrowAccount;

  });

  it("Increments the counter", async () => {
    const escrowAccount = _escrowAccount;

    await program.rpc.increment({
      accounts: {
        escrowAccount: escrowAccount.publicKey,
      },
    });

    const account = await program.account.escrowAccount.fetch(escrowAccount.publicKey);
    console.log('Count 1: ', account.expectedAmount.toString())
    assert.ok(account.expectedAmount.toString() == 1);
  });
});