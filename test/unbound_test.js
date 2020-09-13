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
 const test = artifacts.require("../contracts/testLPT.sol");
 const LLC = artifacts.require("LLC_EthDai");
 const testDai = artifacts.require("TestDai");
 const testEth = artifacts.require("TestEth");
 const uniFactory = artifacts.require("UniswapV2Factory");
 const uniPair = artifacts.require("UniswapV2Pair");
  
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
    let factory;
    
    let pair;
    
  
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
        lockContract = await LLC.deployed();
        
        const pairAddr = await factory.createPair.sendTransaction(tEth.address, tDai.address);
        pair = await uniPair.at(pairAddr.logs[0].address);

        lockContract = await LLC.new(valueContract.address, pairAddr.logs[0].address, 0);
        
        let tDaiAllow = await tDai.approve.sendTransaction(pair.address, 400000);
        let tEthAllow = await tEth.approve.sendTransaction(pair.address, 1000);

        let liquidity = await pair.
        console.log(pair.address);



        // pair = await uniPair.deployed();
        // console.log(pair);
         // lockContract = await LLC.deployed();
      });
  
      it("uDai should have 0 as total suply", async () => {
        const retval = await unboundDai.totalSupply.call();
        assert.equal(retval, totalSupply * decimal, "Total suply is not 0");
      });
      
      it("uDai minted", async () => {
          const retval = await lockContract.lockLPT.sendTransaction(5, unboundDai.address);
          assert.equal(retval, amount > 0, "something wrong");
      })
      
  
    
   });
  