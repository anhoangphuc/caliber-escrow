import { PublicKey, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
export async function airdropSol(connection: Connection, address: PublicKey, amount: number) {
    await connection.requestAirdrop(address, amount * LAMPORTS_PER_SOL);
    await delay(3000);
}

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const CONSTANTS = {
    VAULT_SEED: "VAULT",
}
