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
    #[msg("Exceed allowed list limit")]
    ExceedAllowedListLimit,
    #[msg("Invalid operator")]
    InvalidOperator,
    #[msg("Invalid allowed receiver")]
    InvalidAllowedReceiver,
    #[msg("Expired transfer time")]
    ExpiredTransferTime,
    #[msg("Exceed transfer amount")]
    ExceedTransferAmount,
    #[msg("Invalid asset")]
    InvalidAsset,
    #[msg("In transfer time")]
    InTransferTime,
    #[msg("Invalid user")]
    InvalidUser,
}
