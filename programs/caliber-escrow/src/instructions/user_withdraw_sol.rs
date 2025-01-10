use anchor_lang::prelude::*;

use crate::errors::*;
use crate::states::*;

#[derive(Accounts)]
pub struct UserWithdrawSol<'info> {
    #[account(
        mut,
        constraint = user_deposit.user == user.key() @ EscrowError::InvalidUser,
    )]
    pub user: Signer<'info>,
    #[account(
        mut,
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
}

pub fn handler(ctx: Context<UserWithdrawSol>) -> Result<()> {
    let user_deposit = &mut ctx.accounts.user_deposit;
    let vault = &mut ctx.accounts.vault;
    let user = &mut ctx.accounts.user;

    let amount = user_deposit.amount - user_deposit.transferred_amount;
    user_deposit.withdraw_amount = amount;

    require!(
        !user_deposit.is_in_transfer_time()?,
        EscrowError::InTransferTime
    );
    **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **user.to_account_info().try_borrow_mut_lamports()? += amount;

    Ok(())
}
