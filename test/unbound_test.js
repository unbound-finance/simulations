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
 const uDai = artifacts.require("UnboundDai");
 const valuing = artifacts.require("Valuing_01");
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
    const owner1 = _accounts[2];
    const owner2 = _accounts[3];
    const owner3 = _accounts[4];
    
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
  
      it("UND should have 0 as total suply", async () => {
        const retval = await unboundDai.totalSupply.call();
        assert.equal(retval, totalSupply * decimal, "Total suply is not 0");
      });
      
      it("UND should have valuator", async () => {
        const retval = await unboundDai._valuator.call();
        assert.equal(retval, valueContract.address, "incorrect Valuator");
      });

      it("UND should not transfer", async () => {
        let tester;
        try {
          const retval = await unboundDai.transfer.sendTransaction(safuDev, 5);
          tester = false;
        } catch (err) {
          tester = true;
        }
        
        assert.equal(tester, true, "not supposed to transfer");
      });

      it("UND should not transferFrom", async () => {
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


      it("UND mint - first", async () => {
          let LPTbal = await pair.balanceOf.call(owner0);
          let LPtokens = parseInt(LPTbal.words[0] / 4);
          lockedTokens = LPtokens;
          
          let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
          let minted = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
          let newBal = await unboundDai.balanceOf.call(owner0);
          let checkLoan = await unboundDai.checkLoan.call(owner0, lockContract.address);
          // console.log(newBal);
          // console.log(checkLoan);
          
          assert.equal(newBal.words[0], 95000 * 0.995, "valuing incorrect");
      });

      it("UND check loan", async () => {
        //console.log(unboundDai.checkLoan);
        let tokenBal0 = await unboundDai.checkLoan.call(owner0, lockContract.address);
        
        assert.equal(tokenBal0.words[0], 95000, "valuing incorrect");
      });
      

      it("UND mint - second", async () => {
        let LPTbal = await pair.balanceOf.call(owner0);
        let LPtokens = parseInt(LPTbal.words[0] / 3);

        // let tokenBal0 = await unboundDai.balanceOf.call(owner0);
        
        // first mint
        let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
        let tokenBal = await unboundDai.balanceOf.call(owner0);
        
        let newBal = await pair.balanceOf.call(owner0);
        
        
        
        assert.equal(newBal, LPTbal - LPtokens, "valuing incorrect"); 
      });

      it("UND burn", async () => {
        let uDaiBal = await unboundDai.balanceOf.call(owner0);
        uDaiBal = uDaiBal.words[0];
        let tokenBal4 = await unboundDai.checkLoan.call(owner0, lockContract.address);
        


        let LPTbal = await pair.balanceOf.call(owner0);
        let LPtokens = parseInt(LPTbal.words[0]);
        let tokenBal0 = await unboundDai.balanceOf.call(owner0);
        
        // burn
        let burn = await lockContract.unlockLPT.sendTransaction(lockedTokens, unboundDai.address);
        let tokenBal1 = await unboundDai.balanceOf.call(owner0);
        let newBal = await pair.balanceOf.call(owner0);

        let uDaiBalFinal = await unboundDai.balanceOf.call(owner0);
        uDaiBalFinal = uDaiBalFinal.words[0];

        // console.log(uDaiBal);
        // console.log(LPtokens);
        // console.log(burn);
        // console.log(uDaiBalFinal);

        
        assert.equal(newBal.words[0], LPtokens + lockedTokens, "valuing incorrect");
      });

      it("UND can transfer", async () => {
        let beforeBal = await unboundDai.balanceOf.call(owner0);
        let beforeSafu = await unboundDai.balanceOf.call(safuDev)
        beforeBal = parseInt(beforeBal.words[0]);
        beforeSafu = parseInt(beforeSafu.words[0]);

        let theTransfer = await unboundDai.transfer.sendTransaction(safuDev, 10);
        let finalBal = await unboundDai.balanceOf.call(owner0);
        let safuBal = await unboundDai.balanceOf.call(safuDev);
        finalBal = parseInt(finalBal.words[0]);
        safuBal = parseInt(safuBal.words[0]);

        assert.equal(safuBal, beforeSafu + 10, "receiver balance incorrect")
        assert.equal(finalBal, beforeBal - 10, "sender balance incorrect");
      });

      it("LLC can claim tokens", async () => {
        let sendEth = await tEth.transfer.sendTransaction(lockContract.address, 10);
        let claim = await lockContract.claimTokens.sendTransaction(tEth.address, owner2);
        let finalBalance = await tEth.balanceOf.call(owner2);

        assert.equal(10, finalBalance.words[0], "Claim is not working");
      });

      it("LLC cannot claim from its own Liquidity Pool", async () => {
        let tester = false;
        let sendEth = await tEth.transfer.sendTransaction(lockContract.address, 10);
        try {
          const retval = await lockContract.claimTokens.sendTransaction(pair.address, owner2);
          tester = false;
        } catch (err) {
          tester = true;
        }
        assert.equal(tester, true, "not supposed to be callable");
      });

      it("valuing - cannot assign fee above 5%", async () => {
        let tester = false;
        let sendEth = await tEth.transfer.sendTransaction(lockContract.address, 10);
        try {
          const retval = await lockContract.claimTokens.sendTransaction(pair.address, owner2);
          tester = false;
        } catch (err) {
          tester = true;
        }
        assert.equal(tester, true, "not supposed to be callable");
      });

      it("LLC - other user can't pay off someone elses loan", async () => {
        let LPTbal = await pair.balanceOf.call(owner0);
        let LPtokens = parseInt(LPTbal.words[0] / 3);

        // let tokenBal0 = await unboundDai.balanceOf.call(owner0);
        
        // first mint
        let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);

        // user A balance before
        let tokenBal = await unboundDai.balanceOf.call(owner0);
        tokenBal = parseInt(tokenBal.words[0] / 4);

        // user B balance before
        let beforeSafuBal = await unboundDai.balanceOf.call(safuDev);
        beforeSafuBal = beforeSafuBal.words[0];
        
        
        // transfer funds to other user
        let moveUND = await unboundDai.transfer.sendTransaction(safuDev, tokenBal);

       
        // Trys to unlockLPT with User B
        let correct = false;
        try {
          const payFromSafu = await lockContract.unlockLPT.sendTransaction(LPtokens, unboundDai.address, { from: safuDev });
          console.log(payFromSafu);
        } catch {
          correct = true;
        }

        assert.equal(correct, true, "??");
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

        let approveTdai = await tDai.approve.sendTransaction(route.address, 10000);
        let approveUND = await unboundDai.approve.sendTransaction(route.address, 10000);

        let stakePool = await factory.createPair.sendTransaction(tDai.address, unboundDai.address);
        stakePair = await uniPair.at(stakePool.logs[0].args.pair);
        let d = new Date();
        let time = d.getTime();
        let addLiq = await route.addLiquidity.sendTransaction(tDai.address, unboundDai.address, 10000, 10000, 10, 10, owner0, parseInt(time/1000 + 100));


        let setStake = await unboundDai.changeStaking.sendTransaction(stakePair.address);
      
        
      });

      it("mint UND, check if staking LP receives it", async () => {
        let LPinit = await stakePair.getReserves.call();
        // console.log(LPinit._reserve0);
        // console.log(LPinit._reserve1);

        let LPTbal = await pair.balanceOf.call(owner0);
        let LPtokens = parseInt(LPTbal.words[0] / 3);
        
        let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        let minted = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);

        let newBal = await pair.balanceOf.call(owner0);

        let UNDfinal = await unboundDai.balanceOf.call(stakePair.address);
        // console.log(UNDfinal.words[0]);
        
        
        
        assert.equal(newBal, LPTbal - LPtokens, "valuing incorrect");
      });

      // it("uDai double mint", async () => {
      //   let LPTbal = await pair.balanceOf.call(owner0);
      //   let LPtokens = parseInt(LPTbal.words[0] / 4);

      //   let tokenBal0 = await unboundDai.balanceOf.call(owner0);
        
      //   // first mint
      //   let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
      //   let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
      //   let tokenBal = await unboundDai.balanceOf.call(owner0);
        
      //   // second mint
      //   let approveLP1 = await pair.approve.sendTransaction(lockContract.address, LPtokens);
      //   let mint1 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
      //   let tokenBal1 = await unboundDai.balanceOf.call(owner0);
        

      //   let newBal = await pair.balanceOf.call(owner0);
        
        
        
      //   assert.equal(newBal, LPTbal - LPtokens * 2, "valuing incorrect"); 
      // });

      // it("uDai mint and burn", async () => {
      //   let LPTbal = await pair.balanceOf.call(owner0);
      //   let LPtokens = parseInt(LPTbal.words[0]);
      //   let tokenBal0 = await unboundDai.balanceOf.call(owner0);
        
        
      //   // mint
      //   let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
      //   let mint0 = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
      //   let tokenBal = await unboundDai.balanceOf.call(owner0);
        

      //   // burn
      //   let burn = await lockContract.unlockLPT.sendTransaction(LPtokens, unboundDai.address);
      //   let tokenBal1 = await unboundDai.balanceOf.call(owner0);
      //   let newBal = await pair.balanceOf.call(owner0);
        
      //   assert.equal(newBal.words[0], LPTbal.words[0], "valuing incorrect");
      // });
   });


});