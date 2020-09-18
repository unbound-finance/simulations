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
    expectRevert
  } = require("@openzeppelin/test-helpers");
  
  /*
  *  ========================================================
  *  Tests of public & external functions in Tier1a contract
  *  ========================================================
  */
 const uDai = artifacts.require("unboundDai");
 const valuing = artifacts.require("valuing_01");
//  const test = artifacts.require("../contracts/testLPT.sol");
 const LLC = artifacts.require("LLC_EthDai");
 const testDai = artifacts.require("TestDai");
 const testEth = artifacts.require("TestEth");
 const uniFactory = artifacts.require("UniswapV2Factory");
 const uniPair = artifacts.require("UniswapV2Pair");

 const weth9 = artifacts.require("WETH9");
 
 const router = artifacts.require("UniswapV2Router02")
  
  contract("unboundSystem", function(_accounts) {
    // Initial settings
    const totalSupply = 0;
    const decimal = 10 ** 18;
    const amount = 0
    const owner0 = _accounts[0];
    const safuDev = _accounts[1];
    
    let unboundDai;
    let valueContract;
    let lockContract;
    let tDai;
    let tEth;

    let weth;

    let factory;
    
    let pair;

    let route;
    let wrap;
    
  
    //=================
    // Default Functionality
    //=================
    describe("Check default functionality", () => {
      before(async function() {
        unboundDai = await uDai.deployed();
        valueContract = await valuing.deployed();
        
        factory = await uniFactory.deployed();
        tEth = await testEth.deployed();
        tDai = await testDai.deployed();
        // lockContract = await LLC.deployed();
        weth = await weth9.deployed();
        route = await router.deployed();

        const pairAddr = await factory.createPair.sendTransaction(tDai.address, tEth.address);
        pair = await uniPair.at(pairAddr.logs[0].args.pair);
 

        lockContract = await LLC.new(valueContract.address, pairAddr.logs[0].args.pair, tDai.address);
        
        let permissionLLC = await valueContract.addLLC.sendTransaction(lockContract.address, 2, 200);
        let permissionUdai = await valueContract.allowToken.sendTransaction(unboundDai.address);

        let newValuator = await unboundDai.changeValuator.sendTransaction(valueContract.address);

        let approveTdai = await tDai.approve.sendTransaction(route.address, 400000);
        let approveTeth = await tEth.approve.sendTransaction(route.address, 1000);

        let d = new Date();
        let time = d.getTime();
        let addLiq = await route.addLiquidity.sendTransaction(tDai.address, tEth.address, 400000, 1000, 3000, 10, owner0, parseInt(time/1000 + 100));
        
      });
  
      it("uDai should have 0 as total suply", async () => {
        const retval = await unboundDai.totalSupply.call();
        assert.equal(retval, totalSupply * decimal, "Total suply is not 0");
      });
      
      it("uDai should have valuator", async () => {
        const retval = await unboundDai._valuator.call();
        asset.equal(retval, valueContract.address, "incorrect Valuator");
      });

      it("uDai should not transfer", async () => {
        let tester;
        try {
          const retval = await unboundDai.transfer.sendTransaction(safuDev, 5);
          tester = false;
        } catch (err) {
          tester = true;
        }
        
        assert.equal(tester, true, "not supposed to transfer");
      })

      it("uDai should not transferFrom", async () => {
        let tester;
        try {
          const retval = await unboundDai.transferFrom.sendTransaction(safuDev, owner0, 5);
          tester = false;
        } catch (err) {
          tester = true;
        }
        
        assert.equal(tester, true, "not supposed to transferFrom");
      });

      it("valuator has correct LLC", async () => {
        let LLCstruct = await valueContract.getLLCStruct.call(lockContract.address);
        // console.log(LLCstruct.loanrate.words[0]);
        assert.equal(LLCstruct.loanrate.words[0], 2, "incorrect");
      });

      it("cannot call unboundCreate() on valuator", async () => {
        let tester;
        try {
          const retval = await valueContract.unboundCreate.sendTransaction(20, owner0, unboundDai.address);
          tester = false;
        } catch (err) {
          tester = true;
        }
        
        assert.equal(tester, true, "not supposed to be callable");
      })


      it("uDai mint - single", async () => {
          let LPTbal = await pair.balanceOf.call(owner0);
          let LPtokens = parseInt(LPTbal.words[0] / 4);
          
          let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
          let minted = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
          let newBal = await pair.balanceOf.call(owner0);
          
          assert.equal(newBal, LPTbal - LPtokens, "valuing incorrect");
      });

      it("uDai can transfer", async () => {
        let beforeBal = await unboundDai.balanceOf.call(owner0);
        beforeBal = parseInt(beforeBal.words[0]);

        let theTransfer = await unboundDai.transfer.sendTransaction(safuDev, 10);
        let finalBal = await unboundDai.balanceOf.call(owner0);
        finalBal = parseInt(finalBal.words[0]);

        assert.equal(finalBal, beforeBal - 10, "transfer amounts do not balance");
      })

      it("uDai double mint", async () => {
        let LPTbal = await pair.balanceOf.call(owner0);
        let LPtokens = parseInt(LPTbal.words[0] / 4);

        let tokenBal0 = await unboundDai.balanceOf.call(owner0);
        
        
        // first mint
        let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
        let tokenBal = await unboundDai.balanceOf.call(owner0);
        
        // second mint
        let approveLP1 = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        let mint1 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
        let tokenBal1 = await unboundDai.balanceOf.call(owner0);
        

        let newBal = await pair.balanceOf.call(owner0);
        
        
        
        assert.equal(newBal, LPTbal - LPtokens * 2, "valuing incorrect"); 
      });

      it("uDai mint and burn", async () => {
        let LPTbal = await pair.balanceOf.call(owner0);
        let LPtokens = parseInt(LPTbal.words[0]);
        let tokenBal0 = await unboundDai.balanceOf.call(owner0);
        
        
        // mint
        let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
        let tokenBal = await unboundDai.balanceOf.call(owner0);
        

        // burn
        let burn = await lockContract.unlockLPT.sendTransaction(LPtokens, unboundDai.address);
        let tokenBal1 = await unboundDai.balanceOf.call(owner0);
        let newBal = await pair.balanceOf.call(owner0);
        
        assert.equal(newBal.words[0], LPTbal.words[0], "valuing incorrect");
      });
   });


    //=================
    // Test Staking Pool
    //=================
   describe("Test Staking Function", () => {
      before(async function() {
        unboundDai = await uDai.deployed();
        valueContract = await valuing.deployed();
        
        factory = await uniFactory.deployed();
        tEth = await testEth.deployed();
        tDai = await testDai.deployed();
        
        weth = await weth9.deployed();
        route = await router.deployed();

        let approveTdai = await tDai.approve.sendTransaction(route.address, 400000);
        let approveTeth = await tEth.approve.sendTransaction(route.address, 1000);

        let d = new Date();
        let time = d.getTime();
        let addLiq = await route.addLiquidity.sendTransaction(tDai.address, tEth.address, 400000, 1000, 3000, 10, owner0, parseInt(time/1000 + 100));

        let stakePool = await factory.createPair.sendTransaction(tDai.address, unboundDai.address);
        let stakeAddr = stakePool.logs[0].args.pair;

        let setStake = await unboundDai.changeStaking.sendTransaction(stakeAddr);
      
        
      });

      it("uDai mint - single", async () => {


          let LPTbal = await pair.balanceOf.call(owner0);
          let LPtokens = parseInt(LPTbal.words[0] / 4);
          
          let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
          let minted = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
          let newBal = await pair.balanceOf.call(owner0);
          
          
          
          assert.equal(newBal, LPTbal - LPtokens, "valuing incorrect");
      });

      it("uDai double mint", async () => {
        let LPTbal = await pair.balanceOf.call(owner0);
        let LPtokens = parseInt(LPTbal.words[0] / 4);

        let tokenBal0 = await unboundDai.balanceOf.call(owner0);
        
        // first mint
        let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
        let tokenBal = await unboundDai.balanceOf.call(owner0);
        
        // second mint
        let approveLP1 = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        let mint1 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
        let tokenBal1 = await unboundDai.balanceOf.call(owner0);
        

        let newBal = await pair.balanceOf.call(owner0);
        
        
        
        assert.equal(newBal, LPTbal - LPtokens * 2, "valuing incorrect"); 
      });

      it("uDai mint and burn", async () => {
        let LPTbal = await pair.balanceOf.call(owner0);
        let LPtokens = parseInt(LPTbal.words[0]);
        let tokenBal0 = await unboundDai.balanceOf.call(owner0);
        
        
        // mint
        let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
        let tokenBal = await unboundDai.balanceOf.call(owner0);
        

        // burn
        let burn = await lockContract.unlockLPT.sendTransaction(LPtokens, unboundDai.address);
        let tokenBal1 = await unboundDai.balanceOf.call(owner0);
        let newBal = await pair.balanceOf.call(owner0);
        
        assert.equal(newBal.words[0], LPTbal.words[0], "valuing incorrect");
      });
   });


});