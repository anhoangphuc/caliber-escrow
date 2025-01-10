use crate::errors::EscrowError;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct UserWithdrawSplToken<'info> {
    #[account(
        mut,
        constraint = user_deposit.user == user.key() @ EscrowError::InvalidUser,
    )]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [UserDeposit::SEED.as_bytes(), user_deposit.user.as_ref(), &user_deposit.salt.to_le_bytes()],
        bump,
    )]
    pub user_deposit: Box<Account<'info, UserDeposit>>,
    #[account(
        seeds = [Vault::SEED.as_bytes()],
        bump,
    )]
    pub vault: Box<Account<'info, Vault>>,
    #[account(
        mut,
        associated_token::mint = deposit_token,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = deposit_token,
        associated_token::authority = user,
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    pub deposit_token: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UserWithdrawSplToken>) -> Result<()> {
    let vault = &ctx.accounts.vault;
    let user_deposit = &mut ctx.accounts.user_deposit;

    require!(
        !user_deposit.is_in_transfer_time()?,
        EscrowError::InTransferTime
    );

    let amount =
        user_deposit.amount - user_deposit.transferred_amount - user_deposit.withdraw_amount;
    require!(amount > 0, EscrowError::NoWithdrawAmount);
    user_deposit.withdraw_amount = amount;

    let vault_seeds: &[&[&[u8]]] = &[&[Vault::SEED.as_bytes(), &[ctx.bumps.vault]]];
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: vault.to_account_info(),
        },
        vault_seeds,
    );

    transfer(transfer_ctx, amount)?;

    Ok(())
}
