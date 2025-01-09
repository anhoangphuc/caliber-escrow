use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Asset {
    SOL,
    SPL(Pubkey),
}

#[account]
pub struct UserDeposit {
    pub user: Pubkey,
    pub amount: u64,
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
        8 + 32 + 8 * 2 + 1 + 32 + 16 * 8 + 4 + UserDeposit::MAX_ALLOWED_LIST_SIZE * 32;

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
}