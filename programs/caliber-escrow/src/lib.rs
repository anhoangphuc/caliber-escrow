use anchor_lang::prelude::*;

mod constants;
mod errors;
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

    pub fn admin_add_operator(ctx: Context<AddOrRemoveOperator>, operator: Pubkey) -> Result<()> {
        add_or_remove_operator::add_operator(ctx, operator)
    }

    pub fn admin_remove_operator(
        ctx: Context<AddOrRemoveOperator>,
        operator: Pubkey,
    ) -> Result<()> {
        add_or_remove_operator::remove_operator(ctx, operator)
    }

    pub fn user_deposit_sol(
        ctx: Context<UserDepositSol>,
        salt: u64,
        amount: u64,
        allowed_list: Vec<Pubkey>,
    ) -> Result<()> {
        user_deposit_sol::handler(ctx, salt, amount, allowed_list)
    }

    pub fn user_deposit_spl_token(
        ctx: Context<UserDepositSplToken>,
        salt: u64,
        amount: u64,
        allowed_list: Vec<Pubkey>,
    ) -> Result<()> {
        user_deposit_spl_token::handler(ctx, salt, amount, allowed_list)
    }

    pub fn operator_transfer_sol(ctx: Context<OperatorTransferSol>, amount: u64) -> Result<()> {
        operator_transfer_sol::handler(ctx, amount)
    }

    pub fn user_withdraw_sol(ctx: Context<UserWithdrawSol>) -> Result<()> {
        user_withdraw_sol::handler(ctx)
    }

    pub fn operator_transfer_spl_token(
        ctx: Context<OperatorTransferSplToken>,
        amount: u64,
    ) -> Result<()> {
        operator_transfer_spl_token::handler(ctx, amount)
    }

    pub fn user_withdraw_spl_token(ctx: Context<UserWithdrawSplToken>) -> Result<()> {
        user_withdraw_spl_token::handler(ctx)
    }
}
