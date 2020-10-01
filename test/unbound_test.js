/* eslint-disable no-undef */
/*
 * OpenZeppelin Test Helpers
 * https://github.com/OpenZeppelin/openzeppelin-test-helpers
 */
const {
  BN,
  constants,
  balance,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");

/*
 *  ========================================================
 *  Tests of public & external functions in Tier1a contract
 *  ========================================================
 */
const uDai = artifacts.require("UnboundDai");
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
  const amount = 0;
  const owner = _accounts[0];
  const safu = _accounts[1];
  const devFund = _accounts[2];
  const user = _accounts[3];
  const fee = 200;

  let unboundDai;
  let valueContract;
  let lockContract;
  let tDai;
  let tEth;

  let weth;

  let factory;

  let pair;

  let route;
  let lockedTokens;

  /////////
  let stakePair;

  //=================
  // Default Functionality
  //=================
  describe("Check default functionality", () => {
    before(async function () {
      unboundDai = await uDai.deployed();
      valueContract = await valuing.deployed();

      factory = await uniFactory.deployed();
      tEth = await testEth.deployed();
      tDai = await testDai.deployed();
      // lockContract = await LLC.deployed();
      weth = await weth9.deployed();
      route = await router.deployed();

      const pairAddr = await factory.createPair.sendTransaction(
        tDai.address,
        tEth.address
      );
      pair = await uniPair.at(pairAddr.logs[0].args.pair);

      lockContract = await LLC.new(
        valueContract.address,
        pairAddr.logs[0].args.pair,
        tDai.address
      );

      let permissionLLC = await valueContract.addLLC.sendTransaction(
        lockContract.address,
        2,
        fee
      );
      let permissionUdai = await valueContract.allowToken.sendTransaction(
        unboundDai.address
      );

      let newValuator = await unboundDai.changeValuator.sendTransaction(
        valueContract.address
      );

      let approveTdai = await tDai.approve.sendTransaction(
        route.address,
        400000
      );
      let approveTeth = await tEth.approve.sendTransaction(route.address, 1000);

      let d = new Date();
      let time = d.getTime();
      let addLiq = await route.addLiquidity.sendTransaction(
        tDai.address,
        tEth.address,
        400000,
        1000,
        3000,
        10,
        owner,
        parseInt(time / 1000 + 100)
      );

      let stakePool = await factory.createPair.sendTransaction(
        tDai.address,
        unboundDai.address
      );
      stakePair = await uniPair.at(stakePool.logs[0].args.pair);

      await unboundDai.changeStaking.sendTransaction(stakePair.address);
    });

    //=== UnboundDai ===//
    it("UND should have 0 as total suply", async () => {
      const retval = await unboundDai.totalSupply.call();
      assert.equal(retval, totalSupply * decimal, "Total suply is not 0");
    });

    it("UND should have valuator", async () => {
      const retval = await unboundDai.valuator.call();
      assert.equal(retval, valueContract.address, "incorrect Valuator");
    });

    it("UND should have staking contract address", async () => {
      const retval = await unboundDai.stakeAddr.call();
      assert.equal(
        retval,
        stakePair.address,
        "incorrect staking contract address"
      );
    });

    it("UND should have emergency fund address", async () => {
      const retval = await unboundDai.safuAddr.call();
      assert.equal(retval, safu, "incorrect emergency fund address");
    });

    it("UND should have dev fund address", async () => {
      const retval = await unboundDai.devFundAddr.call();
      assert.equal(retval, devFund, "incorrect dev fund address");
    });

    it("UND should not transfer", async () => {
      const transferAmount = 5;

      await expectRevert(
        unboundDai.transfer.sendTransaction(user, transferAmount),
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("UND should not transferFrom", async () => {
      const transferAmount = 5;

      await expectRevert(
        unboundDai.transferFrom.sendTransaction(user, owner, transferAmount),
        "ERC20: transfer amount exceeds balance"
      );
    });

    //=== LLC ===//
    it("valuator has correct LLC", async () => {
      const firstLoanRate = 2;
      let LLCstruct = await valueContract.getLLCStruct.call(
        lockContract.address
      );
      assert.equal(LLCstruct.loanrate.words[0], firstLoanRate, "incorrect");
    });

    it("cannot call unboundCreate() on valuator", async () => {
      await expectRevert(
        valueContract.unboundCreate.sendTransaction(
          20,
          owner,
          unboundDai.address
        ),
        "LLC not authorized"
      );
    });

    it("cannot call lockLPT() without enough tokens", async () => {
      const mintAmount = 10;

      await expectRevert(
        lockContract.lockLPT.sendTransaction(mintAmount, unboundDai.address, {
          from: user,
        }),
        "LLC: Insufficient LPTs"
      );
    });

    it("UND mint - first", async () => {
      const totalAmount = 95000;
      const stakeShares = 8;
      const safuShares = 8;
      const feeAmount = parseInt(totalAmount / fee);
      const share = parseInt(feeAmount / 20);

      let LPTbal = await pair.balanceOf.call(owner);
      let LPtokens = parseInt(LPTbal.words[0] / 4);
      lockedTokens = LPtokens;

      let approveLP = await pair.approve.sendTransaction(
        lockContract.address,
        LPtokens
      );
      let minted = await lockContract.lockLPT.sendTransaction(
        LPtokens,
        unboundDai.address
      );
      let ownerBal = await unboundDai.balanceOf.call(owner);
      let stakingBal = await unboundDai.balanceOf.call(stakePair.address);
      let safuBal = await unboundDai.balanceOf.call(safu);
      let devFundBal = await unboundDai.balanceOf.call(devFund);

      assert.equal(
        ownerBal.words[0],
        totalAmount - feeAmount,
        "owner balance incorrect"
      );
      assert.equal(
        stakingBal.words[0],
        share * stakeShares,
        "staking balance incorrect"
      );
      assert.equal(
        safuBal.words[0],
        share * safuShares,
        "safu balance incorrect"
      );
      assert.equal(
        devFundBal.words[0],
        feeAmount - share * (stakeShares + safuShares),
        "dev balance incorrect"
      );
    });

    it("UND check loan", async () => {
      let tokenBal0 = await unboundDai.checkLoan.call(
        owner,
        lockContract.address
      );

      assert.equal(tokenBal0.words[0], 95000, "valuing incorrect");
    });

    it("UND mint - second", async () => {
      let LPTbal = await pair.balanceOf.call(owner);
      let LPtokens = parseInt(LPTbal.words[0] / 3);

      // let tokenBal0 = await unboundDai.balanceOf.call(owner);

      // first mint
      let approveLP = await pair.approve.sendTransaction(
        lockContract.address,
        LPtokens
      );
      let mint0 = await lockContract.lockLPT.sendTransaction(
        LPtokens,
        unboundDai.address
      );
      let tokenBal = await unboundDai.balanceOf.call(owner);

      let newBal = await pair.balanceOf.call(owner);

      assert.equal(newBal, LPTbal - LPtokens, "valuing incorrect");
    });

    it("UND burn", async () => {
      let uDaiBal = await unboundDai.balanceOf.call(owner);
      uDaiBal = uDaiBal.words[0];
      let tokenBal4 = await unboundDai.checkLoan.call(
        owner,
        lockContract.address
      );

      let LPTbal = await pair.balanceOf.call(owner);
      let LPtokens = parseInt(LPTbal.words[0]);
      let tokenBal0 = await unboundDai.balanceOf.call(owner);

      // burn
      let burn = await lockContract.unlockLPT.sendTransaction(
        lockedTokens,
        unboundDai.address
      );
      let tokenBal1 = await unboundDai.balanceOf.call(owner);
      let newBal = await pair.balanceOf.call(owner);

      let uDaiBalFinal = await unboundDai.balanceOf.call(owner);
      uDaiBalFinal = uDaiBalFinal.words[0];

      assert.equal(
        newBal.words[0],
        LPtokens + lockedTokens,
        "valuing incorrect"
      );
    });

    it("UND can transfer", async () => {
      let beforeBal = await unboundDai.balanceOf.call(owner);
      let beforeSafu = await unboundDai.balanceOf.call(user);
      beforeBal = parseInt(beforeBal.words[0]);
      beforeSafu = parseInt(beforeSafu.words[0]);

      let theTransfer = await unboundDai.transfer.sendTransaction(user, 10);
      let finalBal = await unboundDai.balanceOf.call(owner);
      let safuBal = await unboundDai.balanceOf.call(user);
      finalBal = parseInt(finalBal.words[0]);
      safuBal = parseInt(safuBal.words[0]);

      assert.equal(safuBal, beforeSafu + 10, "receiver balance incorrect");
      assert.equal(finalBal, beforeBal - 10, "sender balance incorrect");
    });

    it("LLC can claim tokens", async () => {
      let sendEth = await tEth.transfer.sendTransaction(
        lockContract.address,
        10
      );
      let claim = await lockContract.claimTokens.sendTransaction(
        tEth.address,
        user
      );
      let finalBalance = await tEth.balanceOf.call(user);

      assert.equal(10, finalBalance.words[0], "Claim is not working");
    });

    it("LLC cannot claim from its own Liquidity Pool", async () => {
      let sendEth = await tEth.transfer.sendTransaction(
        lockContract.address,
        10
      );
      await expectRevert(
        lockContract.claimTokens.sendTransaction(pair.address, user),
        "Cannot move LP tokens"
      );
    });

    // it("valuing - cannot assign fee above 5%", async () => {
    //   // Something here
    // });

    it("LLC - other user can't pay off someone elses loan", async () => {
      let LPTbal = await pair.balanceOf.call(owner);
      let LPtokens = parseInt(LPTbal.words[0] / 3);

      // let tokenBal0 = await unboundDai.balanceOf.call(owner);

      // first mint
      let approveLP = await pair.approve.sendTransaction(
        lockContract.address,
        LPtokens
      );
      let mint0 = await lockContract.lockLPT.sendTransaction(
        LPtokens,
        unboundDai.address
      );

      // user A balance before
      let tokenBal = await unboundDai.balanceOf.call(owner);
      tokenBal = parseInt(tokenBal.words[0] / 4);

      // user B balance before
      let beforeSafuBal = await unboundDai.balanceOf.call(user);
      beforeSafuBal = beforeSafuBal.words[0];

      // transfer funds to other user
      let moveUND = await unboundDai.transfer.sendTransaction(user, tokenBal);

      // Trys to unlockLPT with User B
      await expectRevert(
        lockContract.unlockLPT.sendTransaction(LPtokens, unboundDai.address, {
          from: user,
        }),
        "Insufficient liquidity locked"
      );
    });
  });

  //=================
  // Test basic functions
  //=================
  describe("Test basic functions", () => {
    it("UND can change staking address", () => {});
  });

  //=================
  // Test Staking Pool
  //=================
  describe("Test Staking Function", () => {
    before(async function () {
      unboundDai = await uDai.deployed();
      valueContract = await valuing.deployed();

      factory = await uniFactory.deployed();
      tEth = await testEth.deployed();
      tDai = await testDai.deployed();

      weth = await weth9.deployed();
      route = await router.deployed();

      let approveTdai = await tDai.approve.sendTransaction(
        route.address,
        10000
      );
      let approveUND = await unboundDai.approve.sendTransaction(
        route.address,
        10000
      );

      // let stakePool = await factory.createPair.sendTransaction(
      //   tDai.address,
      //   unboundDai.address
      // );
      // stakePair = await uniPair.at(stakePool.logs[0].args.pair);
      let d = new Date();
      let time = d.getTime();
      let addLiq = await route.addLiquidity.sendTransaction(
        tDai.address,
        unboundDai.address,
        10000,
        10000,
        10,
        10,
        owner,
        parseInt(time / 1000 + 100)
      );

      // let setStake = await unboundDai.changeStaking.sendTransaction(
      //   stakePair.address
      // );
    });

    it("mint UND, check if staking LP receives it", async () => {
      let LPinit = await stakePair.getReserves.call();

      let LPTbal = await pair.balanceOf.call(owner);
      let LPtokens = parseInt(LPTbal.words[0] / 3);

      let approveLP = await pair.approve.sendTransaction(
        lockContract.address,
        LPtokens
      );
      let minted = await lockContract.lockLPT.sendTransaction(
        LPtokens,
        unboundDai.address
      );

      let newBal = await pair.balanceOf.call(owner);

      let UNDfinal = await unboundDai.balanceOf.call(stakePair.address);
      // console.log(UNDfinal.words[0]);

      assert.equal(newBal, LPTbal - LPtokens, "valuing incorrect");
    });

    // it("uDai double mint", async () => {
    //   let LPTbal = await pair.balanceOf.call(owner);
    //   let LPtokens = parseInt(LPTbal.words[0] / 4);

    //   let tokenBal0 = await unboundDai.balanceOf.call(owner);

    //   // first mint
    //   let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
    //   let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
    //   let tokenBal = await unboundDai.balanceOf.call(owner);

    //   // second mint
    //   let approveLP1 = await pair.approve.sendTransaction(lockContract.address, LPtokens);
    //   let mint1 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
    //   let tokenBal1 = await unboundDai.balanceOf.call(owner);

    //   let newBal = await pair.balanceOf.call(owner);

    //   assert.equal(newBal, LPTbal - LPtokens * 2, "valuing incorrect");
    // });

    // it("uDai mint and burn", async () => {
    //   let LPTbal = await pair.balanceOf.call(owner);
    //   let LPtokens = parseInt(LPTbal.words[0]);
    //   let tokenBal0 = await unboundDai.balanceOf.call(owner);

    //   // mint
    //   let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
    //   let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
    //   let tokenBal = await unboundDai.balanceOf.call(owner);

    //   // burn
    //   let burn = await lockContract.unlockLPT.sendTransaction(LPtokens, unboundDai.address);
    //   let tokenBal1 = await unboundDai.balanceOf.call(owner);
    //   let newBal = await pair.balanceOf.call(owner);

    //   assert.equal(newBal.words[0], LPTbal.words[0], "valuing incorrect");
    // });
  });
});
