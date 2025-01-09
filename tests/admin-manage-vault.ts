import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CaliberEscrow } from "../target/types/caliber_escrow";
import { airdropSol, CONSTANTS } from "./utils";
import { assert } from "chai";

describe("caliber-escrow", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CaliberEscrow as Program<CaliberEscrow>;

  const admin = anchor.web3.Keypair.generate();
  const operators = Array.from({ length: 5 }, () => anchor.web3.Keypair.generate());

  before(async () => {
    await airdropSol(provider.connection, admin.publicKey, 50);
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

  it("Admin add operator failed when operator already exists", async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    try {
      const tx = await program.methods.adminAddOperator(operators[0].publicKey).accounts({
        admin: admin.publicKey,
        vault,
      })
        .signers([admin])
        .rpc({ commitment: 'confirmed' });
      assert.fail('Add operator should fail');
    } catch (e) {
      assert.equal(e.error.errorCode.code, 'OperatorAlreadyExists', "Add operator should fail");
    }
  });

  it("Admin add operator failed when exceed operators limit", async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    try {
      const newOperator = anchor.web3.Keypair.generate();
      const tx = await program.methods.adminAddOperator(newOperator.publicKey).accounts({
        admin: admin.publicKey,
        vault,
      })
        .signers([admin])
        .rpc({ commitment: 'confirmed' });
      assert.fail('Add operator should fail');
    } catch (e) {
      assert.equal(e.error.errorCode.code, 'ExceedOperatorLimit', "Add operator should fail");
    }
  });

  it("Admin remove operator failed when operator not exists", async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    try {
      const newOperator = anchor.web3.Keypair.generate();
      const tx = await program.methods.adminRemoveOperator(newOperator.publicKey).accounts({
        admin: admin.publicKey,
        vault,
      })
        .signers([admin])
        .rpc({ commitment: 'confirmed' });
      assert.fail('Remove operator should fail');
    } catch (e) {
      assert.equal(e.error.errorCode.code, 'OperatorNotExists', "Remove operator should fail");
    }
  });

  it("Admin remove operator success", async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    const tx = await program.methods.adminRemoveOperator(operators[0].publicKey).accounts({
      admin: admin.publicKey,
      vault,
    })
      .signers([admin])
      .rpc({ commitment: 'confirmed' });
    console.log("Remove operator success at", tx);

    const vaultAccount = await program.account.vault.fetch(vault);
    assert.equal(vaultAccount.operators.length, operators.length - 1, "Operators length are not set correctly");
    assert.ok(!vaultAccount.operators.some(op => op.toBase58() === operators[0].publicKey.toBase58()), "Operator is not removed");
  });

  it("Admin add operator success", async () => {
    const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONSTANTS.VAULT_SEED)],
      program.programId
    );
    const tx = await program.methods.adminAddOperator(operators[0].publicKey).accounts({
      admin: admin.publicKey,
      vault,
    })
      .signers([admin])
      .rpc({ commitment: 'confirmed' });
    console.log("Add operator success at", tx);

    const vaultAccount = await program.account.vault.fetch(vault);
    assert.equal(vaultAccount.operators.length, operators.length, "Operators length are not set correctly");
    assert.ok(vaultAccount.operators.some(op => op.toBase58() === operators[0].publicKey.toBase58()), "Operator is not added");
  });
});

