use crate::errors::EscrowError;
use crate::states::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct OperatorTransferSol<'info> {
    #[account(
        constraint = vault.operators.contains(&operator.key()) @ EscrowError::InvalidOperator,
    )]
    pub operator: Signer<'info>,

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

    /// CHECK: The receiver of SOL
    #[account(
        mut,
        constraint = user_deposit.allowed_list.contains(&receiver.key()) @ EscrowError::InvalidAllowedReceiver,
        constraint = user_deposit.asset == Asset::Sol @ EscrowError::InvalidAsset,
    )]
    pub receiver: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<OperatorTransferSol>, amount: u64) -> Result<()> {
    let receiver = &mut ctx.accounts.receiver;
    let vault = &mut ctx.accounts.vault;
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

    **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **receiver.to_account_info().try_borrow_mut_lamports()? += amount;

    Ok(())
}
