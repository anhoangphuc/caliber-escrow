use anchor_lang::prelude::*;

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
        amount: u64,
        allowed_list: Vec<Pubkey>,
        salt: u64,
    ) -> Result<()> {
        user_deposit_sol::handler(ctx, amount, allowed_list, salt)
    }
}
