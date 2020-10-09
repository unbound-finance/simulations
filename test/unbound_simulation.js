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
const { assertion } = require("@openzeppelin/test-helpers/src/expectRevert");

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
  const amount = 0;
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
  let storedFee = 0;

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
        loanRate,
        feeRate
      );
      let permissionUdai = await valueContract.allowToken.sendTransaction(
        unboundDai.address
      );

      let newValuator = await unboundDai.changeValuator.sendTransaction(
        valueContract.address
      );

      let approveTdai = await tDai.approve.sendTransaction(
        route.address,
        1000000000
      );
      let approveTeth = await tEth.approve.sendTransaction(route.address, 10000000);

      let d = new Date();
      let time = d.getTime();
      let addLiq = await route.addLiquidity.sendTransaction(
        tDai.address,
        tEth.address,
        1000000000,
        10000000,
        10000,
        1000,
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
    it("test swap", async () => {
      // const retval = await unboundDai.totalSupply.call();
      // assert.equal(retval, totalSupply * decimal, "Total suply is not 0");

      let ethBalBefore = await tEth.balanceOf.call(owner);
      let daiBalBefore = await tDai.balanceOf.call(owner);

      let priceOfEthBefore = 1000000000 / 10000000;
      //console.log(ethBalBefore);
      
      let initialLiq = await pair.getReserves.call()
      let daiBefore = initialLiq._reserve0.words[0];
      let ethBefore = initialLiq._reserve1.words[0];

      console.log(daiBefore);
      console.log(ethBefore);
      console.log(priceOfEthBefore);
      
      //console.log(ethBefore);

      let approveTdai = await tDai.approve.sendTransaction(
        route.address,
        100000
      );

      let d = new Date();
      let time = d.getTime();
      let simpleSwap = await route.swapExactTokensForTokens.sendTransaction(10000, 100, [tDai.address, tEth.address], owner, parseInt(time / 1000 + 100));
      
      let afterLiq = await pair.getReserves.call();
      //console.log(afterLiq._reserve0.words[0]);
      //console.log(afterLiq._reserve1.words[0]);

      let ethBalAfter = await tEth.balanceOf.call(owner);
      ethBalAfter = ethBalAfter.words[0];
      //console.log(ethBalAfter);
      //console.log(ethBefore - afterLiq._reserve1.words[0])
      //console.log(ethBalAfter - ethBalBefore.words[0]);

      //assert.equal(ethBefore - afterLiq._reserve1.words[0], ethBalAfter - ethBalBefore.words[0], "something wrong");

      

      for (let i = 0; i <= 100; i++) {
        let approveTdai1 = await tDai.approve.sendTransaction(
          route.address,
          100000
        );
        
        let d1 = new Date();
        let time1 = d1.getTime();
        let simpleSwap1 = await route.swapExactTokensForTokens.sendTransaction(10000, 100, [tDai.address, tEth.address], owner, parseInt(time1 / 1000 + 100));
        
        let ethBalFinal = await tEth.balanceOf.call(owner);
        if(i % 5 == 0) {
          console.log(ethBalFinal.words[0] - ethBalAfter);
        }
        
        ethBalAfter = ethBalFinal.words[0];
      }
      
      let finalLiq = await pair.getReserves.call()
      let daiAfter = finalLiq._reserve0.words[0];
      let ethAfter = finalLiq._reserve1.words[0];
      console.log(" --- ");
      console.log(daiBefore);
      console.log(ethBefore);
      console.log(" --- ");
      console.log(daiAfter);
      console.log(ethAfter);

    });

  });
});
