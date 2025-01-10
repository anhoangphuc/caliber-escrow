use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::errors::*;
use crate::states::*;

#[derive(Accounts)]
#[instruction(salt: u64)]
pub struct UserDepositSplToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [Vault::SEED.as_bytes()],
        bump,
    )]
    pub vault: Box<Account<'info, Vault>>,
    #[account(
        mut,
        associated_token::mint = deposit_token,
        associated_token::authority = user,
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = deposit_token,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    pub deposit_token: Box<Account<'info, Mint>>,
    #[account(
        init,
        payer = user,
        space = UserDeposit::SPACE,
        seeds = [UserDeposit::SEED.as_bytes(), user.key().as_ref(), &salt.to_le_bytes()],
        bump
    )]
    pub user_deposit: Box<Account<'info, UserDeposit>>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<UserDepositSplToken>,
    salt: u64,
    amount: u64,
    allowed_list: Vec<Pubkey>,
) -> Result<()> {
    require!(
        allowed_list.len() <= UserDeposit::MAX_ALLOWED_LIST_SIZE,
        EscrowError::ExceedAllowedListLimit
    );
    let user = &ctx.accounts.user;
    let deposit_token = &ctx.accounts.deposit_token;
    let user_deposit = &mut ctx.accounts.user_deposit;

    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: user.to_account_info(),
        },
    );

    transfer(transfer_ctx, amount)?;
    user_deposit.initialize(
        user.key(),
        amount,
        salt,
        Asset::Spl(deposit_token.key()),
        allowed_list,
    )?;

    Ok(())
}
