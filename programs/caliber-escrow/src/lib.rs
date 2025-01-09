use anchor_lang::prelude::*;

mod instructions;
mod states;

use instructions::*;

declare_id!("2HLurVWnnxMYj7xfvSKasKUVWcirE33hXY3fd7rFu4fm");

#[program]
pub mod caliber_escrow {
    use super::*;

    pub fn admin_initialize_vault(
        ctx: Context<InitializeVault>,
        operators: Vec<Pubkey>,
    ) -> Result<()> {
        initialize_vault::handler(ctx, operators)
    }
}
