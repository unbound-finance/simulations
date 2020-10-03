## Unbound.Finance Smart Contract system

Unbound enables users to issue loans against their Liquidity Pool Tokens. Users get liquidity pool tokens when they provide liquidity to AMM's like Uniswap. A user has to lock his liquidity pool tokens and the Unbound system mints Unbound Dollars (UND) based on the current Loan to Value Ratio (LTV). Loan to Value ratio is decided by the admin at the moment but the control will be transferred to DAO soon.

![Flowchart](https://i.ibb.co/rmqDVyq/Screenshot-2020-10-03-at-4-28-29-PM.png)

This is the repository for the Unbound loan smart contract system V1. We enable the user to take out a loan utilizing existing AMM liquidity tokens as collateral.  
Our system consists of three components:

**a) The Unbound loan token (UND) contract:**
    This is an ERC20 token contract which also contains logic for distribution of minting fees as well as mapping user loans. Mint and Burn functions are designed to be called upon from our valuing and/or LLC contract only.

**b) The Unbound Valuing Contract:**
    This smart contract acts as a registry of authorized liquidity pool tokens. Loan LTV rate and minting fees assigned per LLC are also stored here. Valuing functions are called by the LLC to evaluate the stablecoin value of a loan utilizing the stored LTV rate. 

**c) Liquidity Lock Contracts (LLC):**
    The LLC is the contract the user will interact with. Ther must exist one LLC for every liquidity pool to be supported by Unbound.finance. The LLC will lock a users liquidity pool tokens, and initiate the minting process to loan out UND. To unlock the liquidity pool tokens, the user must return (burn) their original UND loan, + minting fees.
    
Unbound.Finance is currently testing on Kovan testnet. Mainnet address will be published soon.
