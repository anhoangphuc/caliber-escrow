use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub admin: Pubkey,
    pub _reserve: [u128; 8],
    pub operators: Vec<Pubkey>,
}

impl Vault {
    pub const SEED: &'static str = "VAULT";
    // max len for operator is 5
    pub const SPACE: usize = 8 + 32 + 16 * 8 + 4 + 5 * 32;

    pub fn initialize(&mut self, admin: Pubkey, operators: Vec<Pubkey>) -> Result<()> {
        self.admin = admin;
        for operator in operators {
            self.add_operator(operator)?;
        }

        Ok(())
    }

    pub fn add_operator(&mut self, operator: Pubkey) -> Result<()> {
        // TODO: check if operator is already in the list, and if the list is full
        self.operators.push(operator);
        Ok(())
    }

    pub fn remove_operator(&mut self, operator: Pubkey) -> Result<()> {
        // TODO: check if operator is in the list
        self.operators.retain(|op| op != &operator);
        Ok(())
    }
}
