// /* eslint-disable no-undef */
// /*
//  * OpenZeppelin Test Helpers
//  * https://github.com/OpenZeppelin/openzeppelin-test-helpers
//  */
// const {
//   BN,
//   constants,
//   balance,
//   expectEvent,
//   expectRevert,
// } = require("@openzeppelin/test-helpers");
// const { assertion } = require("@openzeppelin/test-helpers/src/expectRevert");

// /*
//  *  ========================================================
//  *  Tests of public & external functions in Tier1a contract
// //  *  ========================================================
//  */
// const uDai = artifacts.require("UnboundDollar");
// const valuing = artifacts.require("Valuing_01");
// //  const test = artifacts.require("../contracts/testLPT.sol");
// const LLC = artifacts.require("LLC_EthDai");
// const testDai = artifacts.require("TestDai");
// const testEth = artifacts.require("TestEth");
// const uniFactory = artifacts.require("UniswapV2Factory");
// const uniPair = artifacts.require("UniswapV2Pair");

// const weth9 = artifacts.require("WETH9");

// const router = artifacts.require("UniswapV2Router02");


// // Initial settings
// const totalSupply = 0;
// const decimal = 10 ** 18;
// const amount = 0;
// const owner = "0x74a084d3c8a6FF8889988aba43BD5EDbd265665A";
// const safu = "0xB923b5FAF52e677c73BBee115Bcd80Fd7c8079cE";
// const devFund = "0x8cda3c099F0f262e794Ea71E533E881538767001";
// const user = "0x208B3d9fE7061a53B613De4dd831DC93038ed706";
// const user2 = "0xdA0d8C71816395E4A8E3470A2dB991B54DDe7CE2";
// const daiAmount = 400000;
// const rateBalance = 10 ** 6;
// const loanRate = 500000;
// const feeRate = 5000;
// const stakeSharesPercent = 50;
// const safuSharesPercent = 50;

// let unboundDai;
// let valueContract;
// let lockContract;
// let tDai;
// let tEth;
// let weth;
// let factory;
// let pair;
// let route;
// let lockedTokens;
// let storedFee = 0;

// /////////
// let stakePair;

// console.log('started the tests')

// unboundDai = await uDai.deployed();
// valueContract = await valuing.deployed();

// factory = await uniFactory.deployed();
// tEth = await testEth.deployed();
// tDai = await testDai.deployed();
// // lockContract = await LLC.deployed();
// weth = await weth9.deployed();
// route = await router.deployed();

// const pairAddr = await factory.createPair.sendTransaction(
//   tDai.address,
//   tEth.address
// );
// pair = await uniPair.at(pairAddr.logs[0].args.pair);

// lockContract = await LLC.new(
//   valueContract.address,
//   pairAddr.logs[0].args.pair,
//   tDai.address
// );

// let permissionLLC = await valueContract.addLLC.sendTransaction(
//   lockContract.address,
//   loanRate,
//   feeRate
// );
// let permissionUdai = await valueContract.allowToken.sendTransaction(
//   unboundDai.address
// );

// let newValuator = await unboundDai.changeValuator.sendTransaction(
//   valueContract.address
// );

// let approveTdai1 = await tDai.approve.sendTransaction(
//   route.address,
//   1000000000
// );
// let approveTeth1 = await tEth.approve.sendTransaction(route.address, 10000000);

// let d = new Date();
// let time = d.getTime();
// let addLiq = await route.addLiquidity.sendTransaction(
//   tDai.address,
//   tEth.address,
//   1000000000,
//   10000000,
//   10000,
//   1000,
//   owner,
//   parseInt(time / 1000 + 100)
// );

// let stakePool = await factory.createPair.sendTransaction(
//   tDai.address,
//   unboundDai.address
// );
// stakePair = await uniPair.at(stakePool.logs[0].args.pair);

// await unboundDai.changeStaking.sendTransaction(stakePair.address);

// let ethBalBefore = await tEth.balanceOf.call(owner);
// let daiBalBefore = await tDai.balanceOf.call(owner);

// let priceOfEthBefore = 1000000000 / 10000000;
// //console.log(ethBalBefore);

// let initialLiq = await pair.getReserves.call()
// let daiBefore = initialLiq._reserve0.toString();
// let ethBefore = initialLiq._reserve1.toString();

// console.log('daiBefore', daiBefore);
// console.log('ethBefore', ethBefore);
// console.log('priceOfEthBefore' ,priceOfEthBefore);

// //console.log(ethBefore);
// let randAmt = parseInt((Math.random() * 10000) + 500);
// console.log('Random Amount', randAmt);
// let approveTdai = await tEth.approve.sendTransaction(
//   route.address,
//   randAmt, 
//   {from: user2}
// );

// let d1 = new Date();
// let time1 = d1.getTime();

// let getMin = await route.getAmountsOut.call(randAmt, [tEth.address, tDai.address]);
// let ethMin = getMin[1].toString();
// let simpleSwap = await route.swapExactTokensForTokens.sendTransaction(
//   randAmt, 
//   ethMin, 
//   [tEth.address, tDai.address], 
//   owner, 
//   parseInt(time1 / 1000 + 100), 
//   {from: user2}
// );

// let afterLiq = await pair.getReserves.call();
// //console.log(afterLiq._reserve0.words[0]);
// //console.log(afterLiq._reserve1.words[0]);

// let ethBalAfter = await tEth.balanceOf.call(user2);
// ethBalAfter = ethBalAfter.toString();
// //console.log(ethBalAfter);
// //console.log(ethBefore - afterLiq._reserve1.words[0])
// //console.log(ethBalAfter - ethBalBefore.words[0]);

// //assert.equal(ethBefore - afterLiq._reserve1.words[0], ethBalAfter - ethBalBefore.words[0], "something wrong");

// let priceBefore;
// let price = priceOfEthBefore;

// if (daiBefore <= ethBefore) {
//   priceBefore = ethBefore/daiBefore; 
// } else {
//   priceBefore = daiBefore/ethBefore;
// }

// let i = 0;
// // set price change to test. 1.05 is 5%
// while (price > priceBefore * 0.431) {

//   console.log('Started While Loop')

//   let buyOrSell = parseInt((Math.random() * 1000)+ 1);
//   if (buyOrSell < 980) {
//     let randAmt1 = parseInt((Math.random() * 10000) + 500);

//     let approveTdai1 = await tEth.approve.sendTransaction(
//       route.address,
//       randAmt1,
//       {from: user2}
//     );

//     let getMin1 = await route.getAmountsOut.call(randAmt1, [tEth.address, tDai.address]);
//     let ethMin1 = getMin1[1].toString();
    
//     let d2 = new Date();
//     let time2 = d2.getTime();
//     let simpleSwap1 = await route.swapExactTokensForTokens.sendTransaction(randAmt1, ethMin1, [tEth.address, tDai.address], owner, parseInt(time2 / 1000 + 100), {from: user2});
    
//     let finalLiq = await pair.getReserves.call();
//     let daiAfter = finalLiq._reserve0.toString();
//     let ethAfter = finalLiq._reserve1.toString();
    
    
//     if (daiBefore <= ethBefore) {
//       price = ethAfter / daiAfter;
//     } else {
//       price = daiAfter / ethAfter;
//     }
//     i++;
//     if (i % 20 == 0) {
//       console.log('i', i);
//       console.log('price', price);
//     }
//   } else {
//     let randAmt1 = parseInt((Math.random() * 10000) + 500);

//     let approveTdai1 = await tDai.approve.sendTransaction(
//       route.address,
//       randAmt1,
//       {from: user2}
//     );

//     let getMin1 = await route.getAmountsOut.call(randAmt1, [tDai.address, tEth.address]);
//     let ethMin1 = getMin1[1].toString();
    
//     let d2 = new Date();
//     let time2 = d2.getTime();
//     let simpleSwap1 = await route.swapExactTokensForTokens.sendTransaction(randAmt1, ethMin1, [tDai.address, tEth.address], owner, parseInt(time2 / 1000 + 100), {from: user2});
    
//     let finalLiq = await pair.getReserves.call();
//     let daiAfter = finalLiq._reserve0.toString();
//     let ethAfter = finalLiq._reserve1.toString();
    
    
//     if (daiBefore <= ethBefore) {
//       price = ethAfter / daiAfter;
//     } else {
//       price = daiAfter / ethAfter;
//     }
//     i++;
//     if (i % 20 == 0) {
//       console.log('i',i);
//       console.log('price', price);
//     }
//   }

  
// }


// console.log(" --- ");
// console.log('daiBefore' , daiBefore);
// console.log('ethBefore' , ethBefore);
// if (daiBefore <= ethBefore) {
//   console.log('ethBefore/daiBefore',ethBefore/daiBefore);
//   console.log('ethBefore * 2', ethBefore * 2)
// } else {
//   console.log('daiBefore/ethBefore', daiBefore/ethBefore);
//   console.log('daiBefore*2', daiBefore * 2)
// }



// let finalLiq1 = await pair.getReserves.call();
// let daiAfter1 = finalLiq1._reserve0.toString();
// let ethAfter1 = finalLiq1._reserve1.toString();

// console.log(" --- ");
// console.log('daiAfter1', daiAfter1);
// console.log('ethAfter1', ethAfter1);

// if (daiBefore <= ethBefore) {
//   let newPrice = ethAfter1/daiAfter1;
//   console.log('newPrice', newPrice);
//   let newValue = parseFloat(newPrice) * parseInt(daiAfter1) + parseInt(ethAfter1);
//   let potentialValue = parseFloat(newPrice) * parseInt(daiBefore) + parseInt(ethBefore);
//   console.log('newValue',newValue);
//   console.log('potentialValue',potentialValue);
//   console.log('newValue / potentialValue',newValue / potentialValue);
// } else {
//   let newPrice = daiAfter1/ethAfter1;
//   console.log('newPrice', newPrice);
//   let newValue = parseFloat(newPrice) * parseInt(ethAfter1) + parseInt(daiAfter1);
//   let potentialValue = parseFloat(newPrice) * parseInt(ethBefore) + parseInt(daiBefore);
//   console.log('newValue',newValue);
//   console.log('potentialValue',potentialValue);
//   console.log('newValue / potentialValue',newValue / potentialValue);
// }
    

//     //=== UnboundDai ===//
    

  


// // 1 billion dai
// // 10 million ETH

// // initial value: 
// // 2 billion USD

