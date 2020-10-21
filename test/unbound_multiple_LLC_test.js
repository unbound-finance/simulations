/* eslint-disable no-undef */
/*
 * OpenZeppelin Test Helpers
 * https://github.com/OpenZeppelin/openzeppelin-test-helpers
 */
const { BN, constants, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

/*
 *  ========================================================
 *  Tests of public & external functions in Tier1a contract
 *  ========================================================
 */
const UND = artifacts.require("UnboundDollar");
const valuing = artifacts.require("Valuing_01");
const llcEth = artifacts.require("LLC_EthDai");
const llcLink = artifacts.require("LLC_LinkDai");
const testDai = artifacts.require("TestDai");
const testEth = artifacts.require("TestEth");
const testLink = artifacts.require("TestLink");
const uniFactory = artifacts.require("UniswapV2Factory");
const uniPair = artifacts.require("UniswapV2Pair");
const router = artifacts.require("UniswapV2Router02");

contract("unboundSystem", function (_accounts) {
  // Initial settings
  const totalSupply = 0;
  const decimal = 10 ** 18;
  const owner = _accounts[0];
  const safu = _accounts[1];
  const devFund = _accounts[2];
  const user = _accounts[3];
  const daiAmount = 400000;
  const rateBalance = 10 ** 6;
  const rates = {
    eth: { loanRate: 500000, feeRate: 5000 },
    link: { loanRate: 600000, feeRate: 4000 },
  };
  const stakeSharesPercent = 50;
  const safuSharesPercent = 50;

  let und;
  let valueContract;
  let lockContractEth;
  let lockContractLink;
  let tDai;
  let tEth;
  let tLink;
  let factory;
  let pairEthDai;
  let pairLinkDai;
  let route;
  let lockedTokens;
  let storedFee = 0;
  let stakePair;

  before(async function () {
    tEth = await testEth.deployed();
    tLink = await testLink.deployed();
    tDai = await testDai.deployed();
    route = await router.deployed();
    und = await UND.deployed();
    valueContract = await valuing.deployed();
    lockContractEth = await llcEth.deployed();
    lockContractLink = await llcLink.deployed();
    factory = await uniFactory.deployed();
    pairEthDai = await uniPair.at(await lockContractEth.pair.call());
    pairLinkDai = await uniPair.at(await lockContractLink.pair.call());

    let stakePool = await factory.createPair.sendTransaction(tDai.address, und.address);
    stakePair = await uniPair.at(stakePool.logs[0].args.pair);
    await und.changeStaking.sendTransaction(stakePair.address);

    // Ethereum
    await tDai.approve.sendTransaction(route.address, daiAmount);
    await tEth.approve.sendTransaction(route.address, 1000);
    let d = new Date();
    let time = d.getTime();
    await route.addLiquidity.sendTransaction(
      tDai.address,
      tEth.address,
      daiAmount,
      1000,
      3000,
      10,
      owner,
      parseInt(time / 1000 + 100)
    );

    // Link
    await tDai.approve.sendTransaction(route.address, daiAmount);
    await tLink.approve.sendTransaction(route.address, 1000);
    await route.addLiquidity.sendTransaction(
      tDai.address,
      tLink.address,
      daiAmount,
      1000,
      3000,
      10,
      owner,
      parseInt(time / 1000 + 100)
    );
  });

  //=================
  // Default Functionality
  //=================
  describe("Check default functionality", () => {
    //=== UnboundDai ===//
    it("UND should have 0 as total suply", async () => {
      const retval = await und.totalSupply.call();
      assert.equal(retval, totalSupply * decimal, "Total suply is not 0");
    });

    it("UND should have valuator", async () => {
      const retval = await und.valuator.call();
      assert.equal(retval, valueContract.address, "incorrect Valuator");
    });

    it("UND should have staking contract address", async () => {
      const retval = await und.stakeAddr.call();
      assert.equal(retval, stakePair.address, "incorrect staking contract address");
    });

    it("UND should have emergency fund address", async () => {
      const retval = await und.safuAddr.call();
      assert.equal(retval, safu, "incorrect emergency fund address");
    });

    it("UND should have dev fund address", async () => {
      const retval = await und.devFundAddr.call();
      assert.equal(retval, devFund, "incorrect dev fund address");
    });

    it("UND should not transfer", async () => {
      const transferAmount = 5;

      await expectRevert(
        und.transfer.sendTransaction(user, transferAmount),
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("UND should not transferFrom", async () => {
      const transferAmount = 5;

      await expectRevert(
        und.transferFrom.sendTransaction(user, owner, transferAmount),
        "ERC20: transfer amount exceeds balance"
      );
    });

    //=== LLC ===//
    it("valuator has correct LLC", async () => {
      const LLCstructEth = await valueContract.getLLCStruct.call(lockContractEth.address);
      assert.equal(LLCstructEth.loanrate.words[0], rates.eth.loanRate, "incorrect loanRate");
      assert.equal(LLCstructEth.fee.words[0], rates.eth.feeRate, "incorrect feeRate");

      const LLCstructLink = await valueContract.getLLCStruct.call(lockContractLink.address);
      assert.equal(LLCstructLink.loanrate.words[0], rates.link.loanRate, "incorrect loanRate");
      assert.equal(LLCstructLink.fee.words[0], rates.link.feeRate, "incorrect feeRate");
    });

    it("cannot call unboundCreate() on valuator", async () => {
      await expectRevert(
        valueContract.unboundCreate.sendTransaction(20, owner, und.address),
        "LLC not authorized"
      );
    });

    it("cannot call lockLPT() without enough tokens", async () => {
      const mintAmount = 10;

      await expectRevert(
        lockContractEth.lockLPT.sendTransaction(mintAmount, und.address, {
          from: user,
        }),
        "LLC: Insufficient LPTs"
      );
    });

    it("cannot call lockLPT() small amount", async () => {
      const mintAmount = 1;

      let approveLP = await pairEthDai.approve.sendTransaction(lockContractEth.address, mintAmount);
      await expectRevert(lockContractEth.lockLPT.sendTransaction(mintAmount, und.address), "amount is too small");
    });

    it("UND mint - EthDai first", async () => {
      const lptBalanceBefore = parseInt(await pairEthDai.balanceOf.call(owner));
      const LPtokens = parseInt(lptBalanceBefore / 4); // Amount of token to be lock
      const lockedTokenBefore = parseInt(await lockContractEth.tokensLocked(owner));
      const undBalanceBefore = parseInt(await und.balanceOf.call(owner));
      const stakingBalanceBefore = parseInt(await und.balanceOf.call(stakePair.address));
      const LPTbal = parseInt(await pairEthDai.balanceOf.call(owner));
      const { loanAmount, feeAmount, stakingAmount } = await getAmounts(daiAmount, pairEthDai, LPtokens, rates.eth);

      await pairEthDai.approve.sendTransaction(lockContractEth.address, LPtokens);
      const receipt = await lockContractEth.lockLPT(LPtokens, und.address);
      expectEvent.inTransaction(receipt.tx, und, "Mint", {
        user: owner,
        newMint: loanAmount.toString(),
      });
      
      const lptBalanceAfter = parseInt(await pairEthDai.balanceOf.call(owner));
      const lockedTokenAfter = parseInt(await lockContractEth.tokensLocked(owner));
      const undBalanceAfter = parseInt(await und.balanceOf.call(owner));
      const stakingBalanceAfter = parseInt(await und.balanceOf.call(stakePair.address));
      const loanedAmount = await und.checkLoan.call(owner, lockContractEth.address);

      assert.equal(lptBalanceAfter, lptBalanceBefore - LPtokens, "pool balance incorrect");
      assert.equal(lockedTokenAfter, lockedTokenBefore + LPtokens, "locked token incorrect");
      assert.equal(undBalanceAfter, undBalanceBefore + loanAmount - feeAmount, "owner balance incorrect");
      assert.equal(stakingBalanceAfter, stakingBalanceBefore + stakingAmount, "staking balance incorrect");
      assert.equal(loanedAmount, loanAmount, "loaned amount incorrect");
      console.log(`staking: ${stakingAmount}`);
      storedFee += feeAmount - stakingAmount;
    });

    it("UND mint - LinkDai first", async () => {
      const lptBalanceBefore = parseInt(await pairLinkDai.balanceOf.call(owner));
      const LPtokens = parseInt(lptBalanceBefore / 4); // Amount of token to be lock
      const lockedTokenBefore = parseInt(await lockContractLink.tokensLocked(owner));
      const undBalanceBefore = parseInt(await und.balanceOf.call(owner));
      const stakingBalanceBefore = parseInt(await und.balanceOf.call(stakePair.address));
      const { loanAmount, feeAmount, stakingAmount } = await getAmounts(daiAmount, pairLinkDai, LPtokens, rates.link);

      await pairLinkDai.approve.sendTransaction(lockContractLink.address, LPtokens);
      const receipt = await lockContractLink.lockLPT(LPtokens, und.address);
      expectEvent.inTransaction(receipt.tx, und, "Mint", {
        user: owner,
        newMint: loanAmount.toString(),
      });

      const lptBalanceAfter = parseInt(await pairLinkDai.balanceOf.call(owner));
      const lockedTokenAfter = parseInt(await lockContractLink.tokensLocked(owner));
      const undBalanceAfter = parseInt(await und.balanceOf.call(owner));
      const stakingBalanceAfter = parseInt(await und.balanceOf.call(stakePair.address));
      const loanedAmount = parseInt(await und.checkLoan.call(owner, lockContractLink.address));
      console.log(loanedAmount);

      assert.equal(lptBalanceAfter, lptBalanceBefore - LPtokens, "pool balance incorrect");
      assert.equal(lockedTokenAfter, lockedTokenBefore + LPtokens, "locked token incorrect");
      assert.equal(undBalanceAfter, undBalanceBefore + loanAmount - feeAmount, "owner balance incorrect");
      assert.equal(stakingBalanceAfter, stakingBalanceBefore + stakingAmount, "staking balance incorrect");
      assert.equal(loanedAmount, loanAmount, "loaned amount incorrect");
      console.log(`staking: ${stakingAmount}`);
      storedFee += feeAmount - stakingAmount;
    });

    async function getAmounts(daiAmount, pair, LPtokens, rates) {
      const totalUSD = daiAmount * 2; // Total value in Liquidity pool
      const totalLPTokens = parseInt(await pairEthDai.totalSupply.call()); // Total token amount of Liq pool
      const LPTValueInDai = parseInt((totalUSD * LPtokens) / totalLPTokens); //% value of Liq pool in Dai
      const loanAmount = parseInt((LPTValueInDai * rates.loanRate) / rateBalance); // Loan amount that user can get
      const feeAmount = parseInt((loanAmount * rates.feeRate) / rateBalance); // Amount of fee
      const stakingAmount = parseInt((feeAmount * stakeSharesPercent) / 100);
      return { loanAmount, feeAmount, stakingAmount };
    }

    it("UND burn - EthDai", async () => {
      const lptBalanceBefore = parseInt(await pairEthDai.balanceOf.call(owner));
      const lockedTokenAmount = parseInt(await lockContractEth.tokensLocked(owner));
      const undBalanceBefore = parseInt(await und.balanceOf.call(owner));
      const loanedAmount = parseInt(await und.checkLoan.call(owner, lockContractEth.address));

      // burn
      const receipt = await lockContractEth.unlockLPT(lockedTokenAmount, und.address);
      expectEvent.inTransaction(receipt.tx, und, "Burn", {
        user: owner,
        burned: loanedAmount.toString(),
      });

      const lptBalanceAfter = parseInt(await pairEthDai.balanceOf.call(owner));
      const lockedTokenAfter = parseInt(await lockContractEth.tokensLocked(owner));
      const undBalanceAfter = parseInt(await und.balanceOf.call(owner));
      
      assert.equal(lptBalanceAfter, lptBalanceBefore + lockedTokenAmount, "pool balance incorrect");
      assert.equal(lockedTokenAfter, 0, "locked token incorrect");
      assert.equal(undBalanceAfter, undBalanceBefore - loanedAmount, "owner balance incorrect");
    });

    it("cannot unlock with less than necessary amount of UND", async () => {
      const lockedTokenAmount = parseInt(await lockContractLink.tokensLocked(owner));

      // burn
      await expectRevert(
        lockContractLink.unlockLPT(lockedTokenAmount, und.address),
        "Insufficient UND to pay back loan"
      );
    })
    
    it("UND burn - LinkDai", async () => {
      const lptBalanceBefore = parseInt(await pairLinkDai.balanceOf.call(owner));
      const lockedTokenAmountBefore = parseInt(await lockContractLink.tokensLocked(owner));
      const tokenAmount = lockedTokenAmountBefore / 2;
      const undBalanceBefore = parseInt(await und.balanceOf.call(owner));
      const loanedAmountBefore = parseInt(await und.checkLoan.call(owner, lockContractLink.address));
      const loanedAmount = loanedAmountBefore / 2;

      // burn
      const receipt = await lockContractLink.unlockLPT(tokenAmount, und.address);
      expectEvent.inTransaction(receipt.tx, und, "Burn", {
        user: owner,
        burned: loanedAmount.toString(),
      });

      const lptBalanceAfter = parseInt(await pairLinkDai.balanceOf.call(owner));
      const lockedTokenAmountAfter = parseInt(await lockContractLink.tokensLocked(owner));
      const undBalanceAfter = parseInt(await und.balanceOf.call(owner));
      console.log(undBalanceAfter);
      
      assert.equal(lptBalanceAfter, lptBalanceBefore + tokenAmount, "pool balance incorrect");
      assert.equal(lockedTokenAmountAfter, lockedTokenAmountBefore - tokenAmount, "locked token incorrect");
      assert.equal(undBalanceAfter, undBalanceBefore - loanedAmount, "owner balance incorrect");
    });

    it("UND can distribute the fee to safu and devFund", async () => {
      const beforeStoredFee = parseInt(await und.storedFee.call());
      assert.equal(beforeStoredFee, storedFee, "incorrect before stored fee");

      const beforeSafuBal = parseInt(await und.balanceOf.call(safu));
      const beforeDevFundBal = parseInt(await und.balanceOf.call(devFund));
      const safuShare = parseInt((storedFee * safuSharesPercent) / 100);

      await und.distributeFee({ from: user });

      const afterSafuBal = parseInt(await und.balanceOf.call(safu));
      const afterDevFundBal = parseInt(await und.balanceOf.call(devFund));
      const afterStoredFee = parseInt(await und.storedFee.call());

      assert.equal(afterSafuBal, beforeSafuBal + safuShare, "incorrect safu balance");
      console.log(`safa: ${safuShare}`);
      assert.equal(afterDevFundBal, beforeDevFundBal + storedFee - safuShare, "incorrect dev fund balance");
      console.log(`devFund: ${storedFee - safuShare}`);
      storedFee = 0;
      assert.equal(afterStoredFee, storedFee, "incorrect stored fee");
    });

    it("LLC can claim tokens", async () => {
      let sendEth = await tEth.transfer.sendTransaction(lockContractEth.address, 10);
      let claim = await lockContractEth.claimTokens.sendTransaction(tEth.address, user);
      let finalBalance = await tEth.balanceOf.call(user);

      assert.equal(10, finalBalance.words[0], "Claim is not working");
    });

    it("LLC cannot claim from its own Liquidity Pool", async () => {
      let sendEth = await tEth.transfer.sendTransaction(lockContractEth.address, 10);
      await expectRevert(
        lockContractEth.claimTokens.sendTransaction(pairEthDai.address, user),
        "Cannot move LP tokens"
      );
    });

    it("LLC - other user can't pay off someone elses loan", async () => {
      let LPTbal = await pairEthDai.balanceOf.call(owner);
      let LPtokens = parseInt(LPTbal.words[0] / 3);

      // let tokenBal0 = await und.balanceOf.call(owner);

      // first mint
      let approveLP = await pairEthDai.approve.sendTransaction(lockContractEth.address, LPtokens);
      let mint0 = await lockContractEth.lockLPT.sendTransaction(LPtokens, und.address);

      // user A balance before
      let tokenBal = await und.balanceOf.call(owner);
      tokenBal = parseInt(tokenBal.words[0] / 4);

      // user B balance before
      let beforeSafuBal = await und.balanceOf.call(user);
      beforeSafuBal = beforeSafuBal.words[0];

      // transfer funds to other user
      let moveUND = await und.transfer.sendTransaction(user, tokenBal);

      // Trys to unlockLPT with User B
      await expectRevert(
        lockContractEth.unlockLPT.sendTransaction(LPtokens, und.address, {
          from: user,
        }),
        "Insufficient liquidity locked"
      );
    });
  });
});
