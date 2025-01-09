use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Operator already exists")]
    OperatorAlreadyExists,
    #[msg("Operator not exists")]
    OperatorNotExists,
    #[msg("Exceed operators limit")]
    ExceedOperatorLimit,
    #[msg("Invalid admin")]
    InvalidAdmin,
}
