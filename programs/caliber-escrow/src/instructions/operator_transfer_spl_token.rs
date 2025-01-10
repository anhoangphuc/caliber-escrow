use crate::errors::*;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct OperatorTransferSplToken<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    /// CHECK: The receiver of SPL token
    #[account(
        mut,
        constraint = user_deposit.allowed_list.contains(&receiver.key()) @ EscrowError::InvalidAllowedReceiver,
    )]
    pub receiver: AccountInfo<'info>,
    #[account(
        seeds = [Vault::SEED.as_bytes()],
        bump,
    )]
    pub vault: Box<Account<'info, Vault>>,
    #[account(
        mut,
        seeds = [UserDeposit::SEED.as_bytes(), user_deposit.user.as_ref(), &user_deposit.salt.to_le_bytes()],
        bump,
    )]
    pub user_deposit: Box<Account<'info, UserDeposit>>,
    #[account(
        constraint = user_deposit.asset == Asset::Spl(deposit_token.key()) @ EscrowError::InvalidAsset,
    )]
    pub deposit_token: Box<Account<'info, Mint>>,
    #[account(
        mut,
        associated_token::mint = deposit_token,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = operator,
        associated_token::mint = deposit_token,
        associated_token::authority = receiver,
    )]
    pub receiver_token_account: Box<Account<'info, TokenAccount>>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<OperatorTransferSplToken>, amount: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;
    let user_deposit = &mut ctx.accounts.user_deposit;

    require!(
        user_deposit.is_in_transfer_time()?,
        EscrowError::ExpiredTransferTime
    );
    require!(
        amount + user_deposit.transferred_amount <= user_deposit.amount,
        EscrowError::ExceedTransferAmount
    );
    user_deposit.transferred_amount += amount;

    let vault_seeds: &[&[&[u8]]] = &[&[Vault::SEED.as_bytes(), &[ctx.bumps.vault]]];
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.receiver_token_account.to_account_info(),
            authority: vault.to_account_info(),
        },
        vault_seeds,
    );
    transfer(transfer_ctx, amount)?;

    Ok(())
}
