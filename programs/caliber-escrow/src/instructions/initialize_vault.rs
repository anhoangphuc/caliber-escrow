use crate::states::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = Vault::SPACE,
        seeds = [Vault::SEED.as_bytes()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeVault>, operators: Vec<Pubkey>) -> Result<()> {
    ctx.accounts
        .vault
        .initialize(ctx.accounts.admin.key(), operators)?;
    Ok(())
}
