use crate::errors::EscrowError;
use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub admin: Pubkey,
    pub _reserve: [u128; 8],
    pub operators: Vec<Pubkey>,
}

impl Vault {
    pub const SEED: &'static str = "VAULT";
    pub const MAX_OPERATORS_LEN: usize = 5;
    pub const SPACE: usize = 8 + 32 + 16 * 8 + 4 + Vault::MAX_OPERATORS_LEN * 32;

    pub fn initialize(&mut self, admin: Pubkey, operators: Vec<Pubkey>) -> Result<()> {
        self.admin = admin;
        for operator in operators {
            self.add_operator(operator)?;
        }

        Ok(())
    }

    pub fn add_operator(&mut self, operator: Pubkey) -> Result<()> {
        require!(
            !self.operators.contains(&operator),
            EscrowError::OperatorAlreadyExists
        );
        require!(
            self.operators.len() < Vault::MAX_OPERATORS_LEN,
            EscrowError::ExceedOperatorLimit
        );
        self.operators.push(operator);
        Ok(())
    }

    pub fn remove_operator(&mut self, operator: Pubkey) -> Result<()> {
        require!(
            self.operators.contains(&operator),
            EscrowError::OperatorNotExists
        );
        self.operators.retain(|op| op != &operator);
        Ok(())
    }
}
