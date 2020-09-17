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
    // Default values
    //=================
    describe("Check default values", () => {
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
        let addLiq = await route.addLiquidity.sendTransaction(tDai.address, tEth.address, 90000, 900, 3000, 10, owner0, parseInt(time/1000 + 100));
        

        let LPTbal = await pair.balanceOf.call(owner0);
        let LPtokens = parseInt(LPTbal.words[0] / 2);


        let approveLP = await pair.approve.sendTransaction(lockContract.address, LPtokens);
        

        let minted = await lockContract.lockLPT.sendTransaction(LPtokens, unboundDai.address);
        let uDaiBal = await unboundDai.balanceOf.call(owner0);
        console.log(uDaiBal);

      });
  
      it("uDai should have 0 as total suply", async () => {
        const retval = await unboundDai.totalSupply.call();
        assert.equal(retval, totalSupply * decimal, "Total suply is not 0");
      });
      
      it("uDai should have valuator", async () => {
        
      })
      // it("uDai minted", async () => {
      //     const retval = await lockContract.lockLPT.sendTransaction(5, unboundDai.address);
      //     assert.equal(retval, amount > 0, "something wrong");
      // })
      
  
    
   });
  });