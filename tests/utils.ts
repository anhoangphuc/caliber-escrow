import { PublicKey, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
export async function airdropSol(connection: Connection, address: PublicKey, amount: number) {
    console.log(`Airdrop to ${address.toBase58()} ${amount} SOL`);
    await connection.requestAirdrop(address, amount * LAMPORTS_PER_SOL);
    await delay(3000);
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