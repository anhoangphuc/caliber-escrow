use anchor_lang::prelude::*;

declare_id!("2HLurVWnnxMYj7xfvSKasKUVWcirE33hXY3fd7rFu4fm");

#[program]
pub mod caliber_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
