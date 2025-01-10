use anchor_lang::prelude::*;

use crate::constants::TRANSFER_TIME;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Asset {
    Sol,
    Spl(Pubkey),
}

#[account]
pub struct UserDeposit {
    pub user: Pubkey,
    pub amount: u64,
    pub transferred_amount: u64,
    pub withdraw_amount: u64,
    pub deposited_at: u64,
    // salt is used to separate user's deposits
    pub salt: u64,
    pub asset: Asset,
    pub _reserve: [u128; 8],
    pub allowed_list: Vec<Pubkey>,
}

impl UserDeposit {
    pub const SEED: &'static str = "USER_DEPOSIT";
    pub const MAX_ALLOWED_LIST_SIZE: usize = 5;
    pub const SPACE: usize =
        8 + 32 + 8 * 5 + 1 + 32 + 16 * 8 + 4 + UserDeposit::MAX_ALLOWED_LIST_SIZE * 32;

    pub fn initialize(
        &mut self,
        user: Pubkey,
        amount: u64,
        salt: u64,
        asset: Asset,
        allowed_list: Vec<Pubkey>,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;
        self.user = user;
        self.amount = amount;
        self.deposited_at = current_time;
        self.salt = salt;
        self.asset = asset;
        self.allowed_list = allowed_list;
        Ok(())
    }

    pub fn is_in_transfer_time(&self) -> Result<bool> {
        let current_time = Clock::get()?.unix_timestamp as u64;
        Ok(current_time <= self.deposited_at + TRANSFER_TIME)
    }
}
