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
});
