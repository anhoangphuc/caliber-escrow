# Caliber Escrow

A secure, time-locked escrow program built on Solana that supports both SOL and SPL tokens.

## Overview

Caliber Escrow is a decentralized escrow system that enables users to deposit assets (SOL or SPL tokens) and specify a list of allowed receivers. Authorized operators can then transfer these assets to the allowed receivers within a specified time window.

## Features

- Support for both SOL and SPL token deposits
- Time-locked transfers (24 hours in production, 20 seconds in test)
- Multi-operator support (up to 5 operators)
- Allowed receiver list (up to 5 receivers)
- Admin controls for operator management
- Secure withdrawal mechanism after transfer window expires

## Account Structure

### Vault
- Global program vault that holds all deposits
- Managed by an admin
- Contains list of authorized operators

### UserDeposit
- Individual deposit account for each user
- Stores deposit amount, asset type, and transfer status
- Contains list of allowed receivers
- Tracks deposit timestamp for time-lock enforcement

## Instructions

### Admin Instructions
- `admin_initialize_vault`: Initialize the program vault with operators
- `admin_add_operator`: Add a new operator
- `admin_remove_operator`: Remove an existing operator

### User Instructions
- `user_deposit_sol`: Deposit SOL with allowed receivers list
- `user_deposit_spl_token`: Deposit SPL tokens with allowed receivers list
- `user_withdraw_sol`: Withdraw remaining SOL after transfer window
- `user_withdraw_spl_token`: Withdraw remaining SPL tokens after transfer window

### Operator Instructions
- `operator_transfer_sol`: Transfer SOL to allowed receivers
- `operator_transfer_spl_token`: Transfer SPL tokens to allowed receivers

## Security Features

- Time-locked transfers
- Authorized operator validation
- Allowed receiver validation
- Amount validation to prevent overflow
- Deposit ownership verification
- Multi-signature capability through operator system

## Usage

### Library and version
- anchor-cli: 0.29.0
- solana-cli: 1.18.11
- rustc: 1.79.0
- node: 20.12.2

### Building
- Production build: `anchor build`
- Test build: `anchor build --features test`

### Testing
- Specify the test file in `Anchor.toml`, run test: `anchor test --features test`

### Deploying
- Build 
- Deploy: `anchor deploy --program-name caliber_escrow --provider.cluster https://api.devnet.solana.com --provider.wallet ${WALLET}` 