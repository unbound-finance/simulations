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
const uDai = artifacts.require("UnboundDollar");
const valuing = artifacts.require("Valuing_01");
//  const test = artifacts.require("../contracts/testLPT.sol");
const LLC = artifacts.require("LLC_EthDai");
const testDai = artifacts.require("TestDai");
const testEth = artifacts.require("TestEth");
const uniFactory = artifacts.require("UniswapV2Factory");
const uniPair = artifacts.require("UniswapV2Pair");

const weth9 = artifacts.require("WETH9");

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
  const loanRate = 500000;
  const feeRate = 5000;
  const stakeSharesPercent = 50;
  const safuSharesPercent = 50;

  let und;
  let valueContract;
  let lockContract;
  let tDai;
  let tEth;
  let weth;
  let factory;
  let pair;
  let route;
  let burnTokens;
  let storedFeeTotal = 0;

  /////////
  let stakePair;

  //=================
  // Default Functionality
  //=================
  describe("Check default functionality", () => {
    before(async function () {
      tEth = await testEth.deployed();
      tDai = await testDai.deployed();
      route = await router.deployed();
      und = await uDai.deployed();
      valueContract = await valuing.deployed();
      lockContract = await LLC.deployed();
      factory = await uniFactory.deployed();
      pair = await uniPair.at(await lockContract.pair.call());

      await tDai.approve.sendTransaction(route.address, 400000);
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

      let stakePool = await factory.createPair.sendTransaction(tDai.address, und.address);
      stakePair = await uniPair.at(stakePool.logs[0].args.pair);
      await und.changeStaking.sendTransaction(stakePair.address);
    });

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

    it('UND should be not auto fee distribution', async () => {
      assert.isFalse(await und.autoFeeDistribution(), 'incorrect autoFeeDistribution');
    });

    //=== LLC ===//
    it("valuator has correct LLC", async () => {
      let LLCstruct = await valueContract.getLLCStruct.call(lockContract.address);
      assert.equal(LLCstruct.loanrate.words[0], loanRate, "incorrect loanRate");
      assert.equal(LLCstruct.fee.words[0], feeRate, "incorrect feeRate");
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
        lockContract.lockLPT.sendTransaction(mintAmount, und.address, {
          from: user,
        }),
        "LLC: Insufficient LPTs"
      );
    });

    it("cannot call lockLPT() small amount", async () => {
      const mintAmount = 1;

      const totalUSD = daiAmount * 2; // Total value in Liquidity pool
      const totalLPTokens = parseInt(await pair.totalSupply.call()); // Total token amount of Liq pool
      const LPTValueInDai = parseInt((totalUSD * mintAmount) / totalLPTokens); //% value of Liq pool in Dai
      const loanAmount = parseInt((LPTValueInDai * loanRate) / rateBalance); // Loan amount that user can get
      const feeAmount = parseInt((loanAmount * feeRate) / rateBalance); // Amount of fee

      let approveLP = await pair.approve.sendTransaction(lockContract.address, mintAmount);
      await expectRevert(lockContract.lockLPT.sendTransaction(mintAmount, und.address), "amount is too small");
    });

    it("UND mint - first(not auto fee distribution)", async () => {
      const LPTbal = parseInt(await pair.balanceOf.call(owner));
      const LPtokens = parseInt(LPTbal / 4); // Amount of token to be lock
      burnTokens = LPtokens;

      const totalUSD = daiAmount * 2; // Total value in Liquidity pool
      const totalLPTokens = parseInt(await pair.totalSupply.call()); // Total token amount of Liq pool
      const LPTValueInDai = parseInt((totalUSD * LPtokens) / totalLPTokens); //% value of Liq pool in Dai
      const loanAmount = parseInt((LPTValueInDai * loanRate) / rateBalance); // Loan amount that user can get
      const feeAmount = parseInt((loanAmount * feeRate) / rateBalance); // Amount of fee
      const stakingAmount = 0;

      await pair.approve.sendTransaction(lockContract.address, LPtokens);
      await lockContract.lockLPT.sendTransaction(LPtokens, und.address);
      const ownerBal = parseInt(await und.balanceOf.call(owner));
      const stakingBal = parseInt(await und.balanceOf.call(stakePair.address));
      const loanedAmount = await und.checkLoan.call(owner, lockContract.address);

      assert.equal(ownerBal, loanAmount - feeAmount, "owner balance incorrect");
      assert.equal(stakingBal, stakingAmount, "staking balance incorrect");
      assert.equal(loanedAmount, loanAmount, "loaned amount incorrect");
      storedFeeTotal += feeAmount - stakingAmount;
    });

    it('UND should be able to change autoFeeDistribution', async () => {
      const beforeStoredFee = parseInt(await und.storedFee.call());
      assert.equal(beforeStoredFee, storedFeeTotal, "incorrect before stored fee");

      const beforeStakingBal = parseInt(await und.balanceOf.call(stakePair.address));
      const beforeSafuBal = parseInt(await und.balanceOf.call(safu));
      const beforeDevFundBal = parseInt(await und.balanceOf.call(devFund));

      const stakingShare = parseInt((storedFeeTotal * stakeSharesPercent) / 100);
      const safuShare = parseInt(((storedFeeTotal - stakingShare) * safuSharesPercent) / 100);
      const devShare = storedFeeTotal - stakingShare - safuShare;

      await und.flipFeeDistribution();

      const stakingBal = parseInt(await und.balanceOf.call(stakePair.address));
      const safuBal = parseInt(await und.balanceOf.call(safu));
      const devFundBal = parseInt(await und.balanceOf.call(devFund));
      const storedFee = parseInt(await und.storedFee.call());

      assert.equal(stakingBal, beforeStakingBal + stakingShare, "incorrect staking balance");
      assert.equal(safuBal, beforeSafuBal + safuShare, "incorrect safu balance");
      assert.equal(devFundBal, beforeDevFundBal + devShare, "incorrect dev fund balance");
      console.log(`staking: ${stakingShare}`);
      console.log(`safa: ${safuShare}`);
      console.log(`devFund: ${devShare}`);
      storedFeeTotal = 0;
      assert.equal(storedFee, storedFeeTotal, "incorrect stored fee");
      assert.isTrue(await und.autoFeeDistribution(), 'incorrect autoFeeDistribution');
    });

    it("UND mint - second(auto fee distribution)", async () => {
      const LPTbal = parseInt(await pair.balanceOf.call(owner));
      const LPtokens = parseInt(LPTbal / 3); // Amount of token to be lock
      const beforeOwnerBal = parseInt(await und.balanceOf.call(owner));
      const beforeStakingBal = parseInt(await und.balanceOf.call(stakePair.address));
      const beforeLoanedAmount = parseInt(await und.checkLoan.call(owner, lockContract.address));

      const totalUSD = daiAmount * 2; // Total value in Liquidity pool
      const totalLPTokens = parseInt(await pair.totalSupply.call()); // Total token amount of Liq pool
      const LPTValueInDai = parseInt((totalUSD * LPtokens) / totalLPTokens); //% value of Liq pool in Dai
      const loanAmount = parseInt((LPTValueInDai * loanRate) / rateBalance); // Loan amount that user can get
      const feeAmount = parseInt((loanAmount * feeRate) / rateBalance); // Amount of fee
      const stakingAmount = parseInt((feeAmount * stakeSharesPercent) / 100);

      await pair.approve.sendTransaction(lockContract.address, LPtokens);
      await lockContract.lockLPT.sendTransaction(LPtokens, und.address);

      const ownerBal = parseInt(await und.balanceOf.call(owner));
      const stakingBal = parseInt(await und.balanceOf.call(stakePair.address));
      const loanedAmount = parseInt(await und.checkLoan.call(owner, lockContract.address));

      assert.equal(ownerBal, beforeOwnerBal + (loanAmount - feeAmount), "owner balance incorrect");
      assert.equal(stakingBal, beforeStakingBal + stakingAmount, "staking balance incorrect");
      assert.equal(loanedAmount, beforeLoanedAmount + loanAmount, "loaned amount incorrect");
      storedFeeTotal += feeAmount - stakingAmount;
      console.log(`staking: ${stakingAmount}`);
    });

    it("UND burn", async () => {
      const uDaiBal = parseInt(await und.balanceOf.call(owner));
      const loanedAmount = await und.checkLoan.call(owner, lockContract.address);
      const LPtokens = parseInt(await pair.balanceOf.call(owner));
      const tokenBalBefore = await und.balanceOf.call(owner);
      const burnTokenAmount = parseInt(loanedAmount * burnTokens / LPtokens);

      // burn
      await lockContract.unlockLPT.sendTransaction(burnTokens, und.address);
      const tokenBal = parseInt(await und.balanceOf.call(owner));
      const newBal = parseInt(await pair.balanceOf.call(owner));
      const uDaiBalFinal = parseInt(await und.balanceOf.call(owner));

      assert.equal(tokenBal, tokenBalBefore - burnTokenAmount, "token amount incorrect");
      assert.equal(newBal, LPtokens + burnTokens, "valuing incorrect");
    });

    it("UND can transfer", async () => {
      const transferAmount = 10;
      let beforeBal = await und.balanceOf.call(owner);
      let beforeUser = await und.balanceOf.call(user);
      beforeBal = parseInt(beforeBal.words[0]);
      beforeUser = parseInt(beforeUser.words[0]);

      let theTransfer = await und.transfer.sendTransaction(user, transferAmount);
      let finalBal = await und.balanceOf.call(owner);
      let userBal = await und.balanceOf.call(user);
      finalBal = parseInt(finalBal.words[0]);
      userBal = parseInt(userBal.words[0]);

      assert.equal(userBal, beforeUser + transferAmount, "receiver balance incorrect");
      assert.equal(finalBal, beforeBal - transferAmount, "sender balance incorrect");
    });

    it("UND can distribute the fee to safu and devFund", async () => {
      const beforeStoredFee = parseInt(await und.storedFee.call());
      assert.equal(beforeStoredFee, storedFeeTotal, "incorrect before stored fee");

      const beforeStakingBal = parseInt(await und.balanceOf.call(stakePair.address));
      const beforeSafuBal = parseInt(await und.balanceOf.call(safu));
      const beforeDevFundBal = parseInt(await und.balanceOf.call(devFund));

      const stakingShare = 0;
      const safuShare = parseInt(((storedFeeTotal - stakingShare) * safuSharesPercent) / 100);
      const devShare = storedFeeTotal - stakingShare - safuShare;

      await und.distributeFee({ from: user });

      const stakingBal = parseInt(await und.balanceOf.call(stakePair.address));
      const safuBal = parseInt(await und.balanceOf.call(safu));
      const devFundBal = parseInt(await und.balanceOf.call(devFund));
      const storedFee = parseInt(await und.storedFee.call());

      assert.equal(stakingBal, beforeStakingBal + stakingShare, "incorrect staking balance");
      assert.equal(safuBal, beforeSafuBal + safuShare, "incorrect safu balance");
      assert.equal(devFundBal, beforeDevFundBal + devShare, "incorrect dev fund balance");
      console.log(`staking: ${stakingShare}`);
      console.log(`safa: ${safuShare}`);
      console.log(`devFund: ${devShare}`);
      storedFeeTotal = 0;
      assert.equal(storedFee, storedFeeTotal, "incorrect stored fee");
    });

    it("LLC can claim tokens", async () => {
      let sendEth = await tEth.transfer.sendTransaction(lockContract.address, 10);
      let claim = await lockContract.claimTokens.sendTransaction(tEth.address, user);
      let finalBalance = await tEth.balanceOf.call(user);

      assert.equal(10, finalBalance.words[0], "Claim is not working");
    });

    it("LLC cannot claim from its own Liquidity Pool", async () => {
      let sendEth = await tEth.transfer.sendTransaction(lockContract.address, 10);
      await expectRevert(lockContract.claimTokens.sendTransaction(pair.address, user), "Cannot move LP tokens");
    });

    it("LLC - other user can't pay off someone elses loan", async () => {
      let LPTbal = await pair.balanceOf.call(owner);
      let LPtokens = parseInt(LPTbal.words[0] / 3);

      // let tokenBal0 = await und.balanceOf.call(owner);

      // first mint
      let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
      let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, und.address);

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
        lockContract.unlockLPT.sendTransaction(LPtokens, und.address, {
          from: user,
        }),
        "Insufficient liquidity locked"
      );
    });

    it("LLC - default kill switch", async () => {
      const killSwitch = await lockContract.killSwitch.call();
      assert.isFalse(killSwitch, "Default killSwitch incorrect");
    });

    it("LLC - only owner can use disableLock", async () => {
      await expectRevert(lockContract.disableLock({ from: user }), "Ownable: caller is not the owner");
    });

    it("LLC - change kill switch", async () => {
      // Change kill switch
      expectEvent(await lockContract.disableLock(), "KillSwitch", { position: true });
      assert.isTrue(await lockContract.killSwitch(), "Changed killSwitch incorrect");

      // Check public functions
      const b32 = web3.utils.asciiToHex("1");
      await expectRevert(
        lockContract.lockLPTWithPermit(1, und.address, 1, b32, b32, b32),
        "LLC: This LLC is Deprecated"
      );
      await expectRevert(lockContract.lockLPT(1, und.address), "LLC: This LLC is Deprecated");
      await lockContract.unlockLPT(1, und.address); // Be able to unlock under killed status

      // Rechange kill switch
      expectEvent(await lockContract.disableLock(), "KillSwitch", { position: false });
      assert.isFalse(await lockContract.killSwitch(), "Changed killSwitch incorrect");
    });
  });

  //=================
  // Test Staking Pool
  //=================
  describe("Test Staking Function", () => {
    before(async function () {
      und = await uDai.deployed();
      valueContract = await valuing.deployed();

      factory = await uniFactory.deployed();
      tEth = await testEth.deployed();
      tDai = await testDai.deployed();

      weth = await weth9.deployed();
      route = await router.deployed();

      let approveTdai = await tDai.approve.sendTransaction(route.address, 10000);
      let approveUND = await und.approve.sendTransaction(route.address, 10000);

      // let stakePool = await factory.createPair.sendTransaction(
      //   tDai.address,
      //   und.address
      // );
      // stakePair = await uniPair.at(stakePool.logs[0].args.pair);
      let d = new Date();
      let time = d.getTime();
      let addLiq = await route.addLiquidity.sendTransaction(
        tDai.address,
        und.address,
        10000,
        10000,
        10,
        10,
        owner,
        parseInt(time / 1000 + 100)
      );

      // let setStake = await und.changeStaking.sendTransaction(
      //   stakePair.address
      // );
    });

    it("mint UND, check if staking LP receives it", async () => {
      let LPinit = await stakePair.getReserves.call();

      let LPTbal = await pair.balanceOf.call(owner);
      let LPtokens = parseInt(LPTbal.words[0] / 3);

      let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
      let minted = await lockContract.lockLPT.sendTransaction(LPtokens, und.address);

      let newBal = await pair.balanceOf.call(owner);

      let UNDfinal = await und.balanceOf.call(stakePair.address);
      // console.log(UNDfinal.words[0]);

      assert.equal(newBal, LPTbal - LPtokens, "valuing incorrect");
    });

    // it("uDai double mint", async () => {
    //   let LPTbal = await pair.balanceOf.call(owner);
    //   let LPtokens = parseInt(LPTbal.words[0] / 4);

    //   let tokenBal0 = await und.balanceOf.call(owner);

    //   // first mint
    //   let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
    //   let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, und.address);
    //   let tokenBal = await und.balanceOf.call(owner);

    //   // second mint
    //   let approveLP1 = await pair.approve.sendTransaction(lockContract.address, LPtokens);
    //   let mint1 = await lockContract.lockLPT.sendTransaction(LPtokens, und.address);
    //   let tokenBal1 = await und.balanceOf.call(owner);

    //   let newBal = await pair.balanceOf.call(owner);

    //   assert.equal(newBal, LPTbal - LPtokens * 2, "valuing incorrect");
    // });

    // it("uDai mint and burn", async () => {
    //   let LPTbal = await pair.balanceOf.call(owner);
    //   let LPtokens = parseInt(LPTbal.words[0]);
    //   let tokenBal0 = await und.balanceOf.call(owner);

    //   // mint
    //   let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
    //   let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, und.address);
    //   let tokenBal = await und.balanceOf.call(owner);

    //   // burn
    //   let burn = await lockContract.unlockLPT.sendTransaction(LPtokens, und.address);
    //   let tokenBal1 = await und.balanceOf.call(owner);
    //   let newBal = await pair.balanceOf.call(owner);

    //   assert.equal(newBal.words[0], LPTbal.words[0], "valuing incorrect");
    // });
  });
});
