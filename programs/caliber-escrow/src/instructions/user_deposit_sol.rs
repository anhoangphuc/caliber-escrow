use crate::states::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::errors::*;

#[derive(Accounts)]
#[instruction(salt: u64)]
pub struct UserDepositSol<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [Vault::SEED.as_bytes()],
        bump,
    )]
    pub vault: Box<Account<'info, Vault>>,
    #[account(
        init,
        payer = user,
        space = UserDeposit::SPACE,
        seeds = [UserDeposit::SEED.as_bytes(), user.key().as_ref(), &salt.to_le_bytes()],
        bump
    )]
    pub user_deposit: Box<Account<'info, UserDeposit>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<UserDepositSol>,
    amount: u64,
    allowed_list: Vec<Pubkey>,
    salt: u64,
) -> Result<()> {
    require!(allowed_list.len() <= UserDeposit::MAX_ALLOWED_LIST_SIZE, EscrowError::ExceedAllowedListLimit);
    let user = &ctx.accounts.user;
    let vault = &ctx.accounts.vault;
    let user_deposit = &mut ctx.accounts.user_deposit;
    let transfer_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: user.to_account_info(),
            to: vault.to_account_info(),
        },
    );
    transfer(transfer_ctx, amount)?;
    user_deposit.initialize(
        ctx.accounts.user.key(),
        amount,
        salt,
        Asset::SOL,
        allowed_list,
    )?;
    Ok(())
}
