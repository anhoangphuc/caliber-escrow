use crate::errors::EscrowError;
use crate::states::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AddOrRemoveOperator<'info> {
    #[account(
        address = vault.admin @ EscrowError::InvalidAdmin
    )]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
}

pub fn add_operator(ctx: Context<AddOrRemoveOperator>, operator: Pubkey) -> Result<()> {
    ctx.accounts.vault.add_operator(operator)
}

pub fn remove_operator(ctx: Context<AddOrRemoveOperator>, operator: Pubkey) -> Result<()> {
    ctx.accounts.vault.remove_operator(operator)
}
