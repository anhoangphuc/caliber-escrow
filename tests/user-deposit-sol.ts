import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { CaliberEscrow } from "../target/types/caliber_escrow";
import { Connection, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js'
import { airdropSol, CONSTANTS, delay, getBlockTime } from "./utils";
import { assert } from "chai";

describe("caliber-escrow", () => {
  // Configure the client to use the local cluster.
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  const admin = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();
  const operators = Array.from({ length: 5 }, () => anchor.web3.Keypair.generate());
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(admin), { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const program = anchor.workspace.CaliberEscrow as Program<CaliberEscrow>;

  before(async () => {
    await airdropSol(provider.connection, admin.publicKey, 50);
    await airdropSol(provider.connection, operators[0].publicKey, 50);
    await airdropSol(provider.connection, operators[1].publicKey, 50);
    await airdropSol(provider.connection, user.publicKey, 50);
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

  it(`User deposit sol success`, async () => {
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
    const userBalanceBefore = await provider.connection.getBalance(user.publicKey, 'confirmed');
    const vaultBalanceBefore = await provider.connection.getBalance(vault, 'confirmed');
    const amount = new BN(5 * LAMPORTS_PER_SOL);
    const blockTime = await getBlockTime(provider.connection);
    const allowedList = Array.from({ length: 5 }, () => anchor.web3.Keypair.generate().publicKey);
    const tx = await program.methods.userDepositSol(salt, amount, allowedList).accounts({
      user: user.publicKey,
      vault,
      userDeposit,
    })
      .signers([user])
      .rpc({ commitment: 'confirmed' });

    console.log("User deposit sol success at", tx);
    const userBalanceAfter = await provider.connection.getBalance(user.publicKey, 'confirmed');
    const vaultBalanceAfter = await provider.connection.getBalance(vault, 'confirmed');
    const userDepositBalance = await provider.connection.getBalance(userDeposit, 'confirmed');

    // Deposited amount and fee to create user deposit balance
    assert.equal(userBalanceBefore - userBalanceAfter - userDepositBalance, amount.toNumber(), "User balance is not updated correctly");
    assert.equal(vaultBalanceAfter - vaultBalanceBefore, amount.toNumber(), "Vault balance is not updated correctly");

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
  })
});

