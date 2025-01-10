import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { CaliberEscrow } from "../target/types/caliber_escrow";
import { Connection, LAMPORTS_PER_SOL, Transaction, PublicKey } from '@solana/web3.js'
import { createMint, getAssociatedTokenAddress, mintTo } from '@solana/spl-token';
import { airdropSol, airdropToken, CONSTANTS, delay, getBlockTime } from "./utils";
import { assert } from "chai";

describe("caliber-escrow", () => {
  // Configure the client to use the local cluster.
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const admin = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();
  const operators = Array.from({ length: 5 }, () => anchor.web3.Keypair.generate());
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(admin), { commitment: 'confirmed' });
  const allowedList = Array.from({ length: 5 }, () => anchor.web3.Keypair.generate().publicKey);
  anchor.setProvider(provider);

  const program = anchor.workspace.CaliberEscrow as Program<CaliberEscrow>;
  let mint: PublicKey;

  before(async () => {
    await airdropSol(provider.connection, admin.publicKey, 50);
    await airdropSol(provider.connection, operators[0].publicKey, 50);
    await airdropSol(provider.connection, operators[1].publicKey, 50);
    await airdropSol(provider.connection, user.publicKey, 50);
    mint = await createMint(provider.connection, admin, admin.publicKey, admin.publicKey, 6);
    await delay(1000);

    await airdropToken(provider, admin, user.publicKey, mint, 50 * 10 ** 6);
  })


  it("Is initialized!", async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    const tx = await program.methods.adminInitializeVault(operators.map(op => op.publicKey)).accounts({
      admin: admin.publicKey,
      vault,
    })
      .signers([admin])
      .rpc({ commitment: 'confirmed' });
    console.log("Initialize vault success at", tx);

    const vaultAccount = await program.account.vault.fetch(vault);
    assert.equal(vaultAccount.admin.toBase58(), admin.publicKey.toBase58(), "Admin is not set correctly");
    assert.equal(vaultAccount.operators.length, operators.length, "Operators length are not set correctly");
    for (let i = 0; i < operators.length; i++) {
      assert.equal(vaultAccount.operators[i].toBase58(), operators[i].publicKey.toBase58(), `Operator ${i} is not set correctly`);
    }
  });

  it(`User deposit token success`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    // use current time as salt
    const salt = new BN(Math.floor(Date.now() / 1000));
    const [userDeposit] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.USER_DEPOSIT_SEED), user.publicKey.toBuffer(), salt.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
    const userTokenAccount = await getAssociatedTokenAddress(mint, user.publicKey);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    const userBalanceBefore = Number((await provider.connection.getTokenAccountBalance(userTokenAccount, 'confirmed')).value.amount);
    const amount = new BN(5 * 10 ** 6);
    const blockTime = await getBlockTime(provider.connection);
    const tx = await program.methods.userDepositSplToken(salt, amount, allowedList).accounts({
      user: user.publicKey,
      vault,
      userDeposit,
      userTokenAccount,
      vaultTokenAccount,
      depositToken: mint,
    })
      .signers([user])
      .rpc({ commitment: 'confirmed' });

    console.log("User deposit token success at", tx);
    const userBalanceAfter = Number((await provider.connection.getTokenAccountBalance(userTokenAccount, 'confirmed')).value.amount);
    const vaultBalanceAfter = Number((await provider.connection.getTokenAccountBalance(vaultTokenAccount, 'confirmed')).value.amount);

    // Deposited amount and fee to create user deposit balance
    assert.equal(userBalanceBefore - userBalanceAfter, amount.toNumber(), "User balance is not updated correctly");
    assert.equal(vaultBalanceAfter, amount.toNumber(), "Vault balance is not updated correctly");

    const userDepositAccount = await program.account.userDeposit.fetch(userDeposit);
    assert.equal(userDepositAccount.amount.toNumber(), amount.toNumber(), "User deposit amount is not set correctly");
    assert.equal(userDepositAccount.allowedList.length, allowedList.length, "Allowed list is not set correctly");
    for (let i = 0; i < allowedList.length; i++) {
      assert.equal(userDepositAccount.allowedList[i].toBase58(), allowedList[i].toBase58(), `Allowed list ${i} is not set correctly`);
    }
    assert.equal(userDepositAccount.user.toBase58(), user.publicKey.toBase58(), "User is not set correctly");
    assert.ok(userDepositAccount.depositedAt.toNumber() >= blockTime && userDepositAccount.depositedAt.toNumber() <= blockTime + 10, "Block time is not set correctly");
    assert.equal(userDepositAccount.transferredAmount.toNumber(), 0, "Transferred amount is not set correctly");
    assert.equal(userDepositAccount.withdrawAmount.toNumber(), 0, "Withdraw amount is not set correctly");
    assert.equal(userDepositAccount.asset.spl[0].toBase58(), mint.toBase58(), "Asset is not set correctly");
  })

  it(`User withdraw remain spl token failed due to in transfer time`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );

    const userDepositAccount = (await program.account.userDeposit.all())[0];
    const userTokenAccount = await getAssociatedTokenAddress(mint, user.publicKey);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    try {
      const tx = await program.methods.userWithdrawSplToken().accounts({
        user: user.publicKey,
        vault,
        userDeposit: userDepositAccount.publicKey,
        userTokenAccount,
        vaultTokenAccount,
        depositToken: mint,
      })
        .signers([user])
        .rpc({ commitment: 'confirmed' });
      console.log('Withdraw success at tx', tx);
      assert.fail("Withdraw should fail");
    } catch (e) {
      assert.equal(e.error.errorCode.code, 'InTransferTime', "Withdraw should fail of in transfer time");
    }
  })

  it(`Operator transfer spl token success`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    const userDeposit = (await program.account.userDeposit.all())[0].publicKey;
    // use current time as salt
    const receiver = allowedList[0];
    const receiverTokenAccount = await getAssociatedTokenAddress(mint, receiver, true);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    const vaultBalanceBefore = Number((await provider.connection.getTokenAccountBalance(vaultTokenAccount, 'confirmed')).value.amount);
    const amount = new BN(1 * 10 ** 6);
    const tx = await program.methods.operatorTransferSplToken(amount).accounts({
      operator: operators[0].publicKey,
      vault,
      userDeposit,
      receiver,
      receiverTokenAccount,
      vaultTokenAccount,
      depositToken: mint,
    })
      .signers([operators[0]])
      .rpc({ commitment: 'confirmed' });

    console.log("Operator transfer spl token success at", tx);
    const receiverBalanceAfter = Number((await provider.connection.getTokenAccountBalance(receiverTokenAccount, 'confirmed')).value.amount);
    const vaultBalanceAfter = Number((await provider.connection.getTokenAccountBalance(vaultTokenAccount, 'confirmed')).value.amount);

    assert.equal(receiverBalanceAfter, amount.toNumber(), "User balance is not updated correctly");
    assert.equal(vaultBalanceBefore - vaultBalanceAfter, amount.toNumber(), "Vault balance is not updated correctly");

    const userDepositAccount = await program.account.userDeposit.fetch(userDeposit);
    assert.equal(userDepositAccount.transferredAmount.toNumber(), amount.toNumber(), "Transferred amount is not set correctly");
  })

  it(`Operator transfer sol success to other user`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    const userDepositAccountBefore = (await program.account.userDeposit.all())[0];
    // use current time as salt
    const receiver = allowedList[1];
    const receiverTokenAccount = await getAssociatedTokenAddress(mint, receiver, true);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    const vaultBalanceBefore = Number((await provider.connection.getTokenAccountBalance(vaultTokenAccount, 'confirmed')).value.amount);
    const amount = new BN(2 * 10 ** 6);
    try {
      const tx = await program.methods.operatorTransferSplToken(amount).accounts({
        operator: operators[0].publicKey,
        vault,
        userDeposit: userDepositAccountBefore.publicKey,
        receiver,
        receiverTokenAccount,
        vaultTokenAccount,
        depositToken: mint,
      })
        .signers([operators[0]])
        .rpc({ commitment: 'confirmed' });

      console.log("Operator transfer spl token to other user success at", tx);
    } catch (e) {
      console.error(e);
    }
    const receiverBalanceAfter = Number((await provider.connection.getTokenAccountBalance(receiverTokenAccount, 'confirmed')).value.amount);
    const vaultBalanceAfter = Number((await provider.connection.getTokenAccountBalance(vaultTokenAccount, 'confirmed')).value.amount);

    assert.equal(receiverBalanceAfter, amount.toNumber(), "User balance is not updated correctly");
    assert.equal(vaultBalanceBefore - vaultBalanceAfter, amount.toNumber(), "Vault balance is not updated correctly");

    const userDepositAccount = await program.account.userDeposit.fetch(userDepositAccountBefore.publicKey);
    assert.equal(userDepositAccountBefore.account.transferredAmount.toNumber() + amount.toNumber(), userDepositAccount.transferredAmount.toNumber(), "Transferred amount is not set correctly");
  })


  it(`Operator transfer spl token failed to unallowed receiver`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    const userDeposit = (await program.account.userDeposit.all())[0].publicKey;
    const amount = new BN(1 * 10 ** 6);
    const receiver = anchor.web3.Keypair.generate().publicKey;
    const receiverTokenAccount = await getAssociatedTokenAddress(mint, receiver, true);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    try {
      const tx = await program.methods.operatorTransferSplToken(amount).accounts({
        operator: operators[0].publicKey,
        vault,
        userDeposit,
        receiver,
        receiverTokenAccount,
        vaultTokenAccount,
        depositToken: mint,
      })
        .signers([operators[0]])
        .rpc({ commitment: 'confirmed' });
      assert.fail("Transfer should fail");
    } catch (e) {
      assert.equal(e.error.errorCode.code, 'InvalidAllowedReceiver', "Transfer should fail");
    }
  })

  it(`Operator transfer spl token failed to exceed transfer amount`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    const userDeposit = (await program.account.userDeposit.all())[0].publicKey;
    const amount = new BN(5 * 10 ** 6);
    const receiver = allowedList[1];
    const receiverTokenAccount = await getAssociatedTokenAddress(mint, receiver, true);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    try {
      const tx = await program.methods.operatorTransferSplToken(amount).accounts({
        operator: operators[0].publicKey,
        vault,
        userDeposit,
        receiver,
        receiverTokenAccount,
        vaultTokenAccount,
        depositToken: mint,
      })
        .signers([operators[0]])
        .rpc({ commitment: 'confirmed' });
      assert.fail("Transfer should fail");
    } catch (e) {
      assert.equal(e.error.errorCode.code, 'ExceedTransferAmount', "Transfer should fail of exceed transfer amount");
    }
  })

  it(`Operator transfer spl token failed to overflow`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );

    const userDeposit = (await program.account.userDeposit.all())[0].publicKey;
    const amount = new BN(2).pow(new BN(64)).sub(new BN(1));
    const receiver = allowedList[1];
    const receiverTokenAccount = await getAssociatedTokenAddress(mint, receiver, true);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    try {
      const tx = await program.methods.operatorTransferSplToken(amount).accounts({
        operator: operators[0].publicKey,
        vault,
        userDeposit,
        receiver,
        receiverTokenAccount,
        vaultTokenAccount,
        depositToken: mint,
      })
        .signers([operators[0]])
        .rpc({ commitment: 'confirmed' });
      assert.fail("Transfer should fail");
    } catch (e) {
      assert.ok(e.transactionLogs.some(log => log.includes("add with overflow")));
    }
  })

  it(`Operator transfer spl token failed due to expired transfer time`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );

    const userDepositAccount = (await program.account.userDeposit.all())[0];
    const amount = new BN(1 * 10 ** 6);
    const receiver = allowedList[1];
    const receiverTokenAccount = await getAssociatedTokenAddress(mint, receiver, true);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    const currentTime = await getBlockTime(provider.connection);
    await delay((userDepositAccount.account.depositedAt.toNumber() + 24 - currentTime) * 1000);
    try {
      const tx = await program.methods.operatorTransferSplToken(amount).accounts({
        operator: operators[0].publicKey,
        vault,
        userDeposit: userDepositAccount.publicKey,
        receiver,
        receiverTokenAccount,
        vaultTokenAccount,
        depositToken: mint,
      })
        .signers([operators[0]])
        .rpc({ commitment: 'confirmed' });
      assert.fail("Transfer should fail");
    } catch (e) {
      assert.equal(e.error.errorCode.code, 'ExpiredTransferTime', "Transfer should fail of expire transfer time");
    }
  })

  it(`User withdraw remain spl token`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    const userTokenAccount = await getAssociatedTokenAddress(mint, user.publicKey);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    const userDepositAccount = (await program.account.userDeposit.all())[0];
    const remainingAmount = userDepositAccount.account.amount.toNumber() - userDepositAccount.account.transferredAmount.toNumber();
    const userBalanceBefore = Number((await provider.connection.getTokenAccountBalance(userTokenAccount, 'confirmed')).value.amount);
    const vaultBalanceBefore = Number((await provider.connection.getTokenAccountBalance(vaultTokenAccount, 'confirmed')).value.amount);
    const tx = await program.methods.userWithdrawSplToken().accounts({
      user: user.publicKey,
      vault,
      userDeposit: userDepositAccount.publicKey,
      userTokenAccount,
      vaultTokenAccount,
      depositToken: mint,
    })
      .signers([user])
      .rpc({ commitment: 'confirmed' });
    console.log('Withdraw success at tx', tx);
    const userDepositAccountAfter = await program.account.userDeposit.fetch(userDepositAccount.publicKey);
    const userBalanceAfter = Number((await provider.connection.getTokenAccountBalance(userTokenAccount, 'confirmed')).value.amount);
    const vaultBalanceAfter = Number((await provider.connection.getTokenAccountBalance(vaultTokenAccount, 'confirmed')).value.amount);
    assert.equal(userBalanceAfter - userBalanceBefore, remainingAmount, "User balance is not updated correctly");
    assert.equal(vaultBalanceAfter - vaultBalanceBefore, -remainingAmount, "Vault balance is not updated correctly");
    assert.equal(userDepositAccountAfter.withdrawAmount.toNumber(), remainingAmount, "Withdraw amount is not set correctly");
  })

  it(`User withdraw remain spl token failed due to no withdraw amount`, async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    const userTokenAccount = await getAssociatedTokenAddress(mint, user.publicKey);
    const vaultTokenAccount = await getAssociatedTokenAddress(mint, vault, true);
    const userDepositAccount = (await program.account.userDeposit.all())[0];
    try {
    const tx = await program.methods.userWithdrawSplToken().accounts({
      user: user.publicKey,
      vault,
      userDeposit: userDepositAccount.publicKey,
      userTokenAccount,
      vaultTokenAccount,
      depositToken: mint,
    })
        .signers([user])
        .rpc({ commitment: 'confirmed' });
      assert.fail('Withdraw should fail');
    } catch (e) {
      assert.equal(e.error.errorCode.code, 'NoWithdrawAmount', "Withdraw should fail of no withdraw amount");
    }
  })
});

