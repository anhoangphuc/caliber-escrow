#[cfg(not(feature = "test"))]
pub const TRANSFER_TIME: u64 = 24 * 60 * 60; // 1 day

#[cfg(feature = "test")]
pub const TRANSFER_TIME: u64 = 20;
