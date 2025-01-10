import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { createMintToInstruction, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";
import { use } from "chai";
export async function airdropSol(connection: Connection, address: PublicKey, amount: number) {
    console.log(`Airdrop to ${address.toBase58()} ${amount} SOL`);
    await connection.requestAirdrop(address, amount * LAMPORTS_PER_SOL);
    await delay(3000);
}
export async function airdropToken(provider: AnchorProvider, mintAuthority: Keypair, user: PublicKey, mint: PublicKey, amount: number) {
    const associatedTokenAccount = await getAssociatedTokenAddress(mint, user);
    const craeteAtaIns = await createAssociatedTokenAccountInstruction(
        mintAuthority.publicKey,
        associatedTokenAccount,
        user,
        mint,
    )
    const mintToIns = await createMintToInstruction(
        mint,
        associatedTokenAccount,
        mintAuthority.publicKey,
        amount,
    )
    const tx = new Transaction().add(craeteAtaIns, mintToIns);
    await provider.sendAndConfirm(tx, [mintAuthority], { commitment: 'confirmed' });
}

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const CONSTANTS = {
    VAULT_SEED: "VAULT",
    USER_DEPOSIT_SEED: "USER_DEPOSIT",
}

export async function getBlockTime(connection: Connection) {
    const slot = await connection.getSlot('confirmed');
    const blockTime = await connection.getBlockTime(slot);
    return blockTime;
}