const uDai = artifacts.require("UnboundDollar");
const valuing = artifacts.require("Valuing_01");
// const test = artifacts.require("../contracts/testLPT.sol");
const LLC = artifacts.require("LLC_EthDai");

const uniFactory = artifacts.require("UniswapV2Factory");
const uniPair = artifacts.require("UniswapV2Pair");
const router = artifacts.require("UniswapV2Router02");

const testDai = artifacts.require("TestDai");
const testDai13 = artifacts.require("TestDai13");
const testDai19 = artifacts.require("TestDai19");
const testEth = artifacts.require("TestEth");
const testLink = artifacts.require("TestLink");
const weth8 = artifacts.require("WETH9");
// const feeSplitter = artifacts.require("feeSplitter");
// const LPTstake = artifacts.require("unboundStaking");



const tester = "0x8559c741Ae422fD3CA9209112c5d477C5392B170";

module.exports = async (deployer, network, accounts) => {

  console.log('Starting Simulations')
  let safu1 = "0x";
  let devFund1 = "0x";

  if (network == "development" || network == "test") {
    safu1 = accounts[1];
    devFund1 = accounts[2];
  }

  await deployer.deploy(uDai, "Unbound Dollar", "UND", safu1, devFund1);
  await deployer.deploy(valuing, uDai.address);
  await deployer.deploy(testDai, accounts[4], "5777");
  await deployer.deploy(testDai13, tester, "5777");
  await deployer.deploy(testDai19, tester, "5777");
  await deployer.deploy(testEth, accounts[4]);
  await deployer.deploy(testLink, accounts[4]);
  if (network == "development" || network == "test") {
    const feeToSetter = accounts[0];
    await deployer.deploy(uniFactory, feeToSetter);
    await deployer.deploy(weth8);
    await deployer.deploy(router, uniFactory.address, weth8.address);
  }

  // Initial settings
const totalSupply = 0;
const decimal = 10 ** 18;
const amount = 0;
const owner = accounts[0];
const safu = accounts[1];
const devFund = accounts[2];
const user = accounts[3];
const user2 = accounts[4];
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

unboundDai = await uDai.deployed();
valueContract = await valuing.deployed();

factory = await uniFactory.deployed();
tEth = await testEth.deployed();
tDai = await testDai.deployed();
// lockContract = await LLC.deployed();
weth = await weth8.deployed();
route = await router.deployed();

const pairAddr = await factory.createPair.sendTransaction(
  tDai.address,
  tEth.address
);
pair = await uniPair.at(pairAddr.logs[0].args.pair);

// console.log(uniPair.totalSupply.call())

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

let approveTdai1 = await tDai.approve.sendTransaction(
  route.address,
  4000000000
);
let approveTeth1 = await tEth.approve.sendTransaction(route.address, 10000000);

let d = new Date();
let time = d.getTime();
let addLiq = await route.addLiquidity.sendTransaction(
  tDai.address,
  tEth.address,
  4000000000,
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

let ethBalBefore = await tEth.balanceOf.call(owner);
let daiBalBefore = await tDai.balanceOf.call(owner);

let priceOfEthBefore = 4000000000 / 10000000;
//console.log(ethBalBefore);

let initialLiq = await pair.getReserves.call()
let daiBefore = initialLiq._reserve0.toString();
let ethBefore = initialLiq._reserve1.toString();

console.log('daiBefore',daiBefore);
console.log('ethBefore',ethBefore);
console.log('priceOfEthBefore',priceOfEthBefore);

//console.log(ethBefore);
// let randAmt = parseInt((Math.random() * 10000) + 500);
let randAmt = 100;

console.log('randAmt',randAmt);
let approveTdai = await tEth.approve.sendTransaction(
  route.address,
  randAmt, 
  {from: user2}
);

let d1 = new Date();
let time1 = d1.getTime();

let getMin = await route.getAmountsOut.call(randAmt, [tEth.address, tDai.address]);
let ethMin = getMin[1].toString();
let simpleSwap = await route.swapExactTokensForTokens.sendTransaction(
  randAmt, 
  ethMin, 
  [tEth.address, tDai.address], 
  owner, 
  parseInt(time1 / 1000 + 100), 
  {from: user2}
);

let afterLiq = await pair.getReserves.call();
//console.log(afterLiq._reserve0.words[0]);
//console.log(afterLiq._reserve1.words[0]);

let ethBalAfter = await tEth.balanceOf.call(user2);
ethBalAfter = ethBalAfter.toString();
//console.log(ethBalAfter);
//console.log(ethBefore - afterLiq._reserve1.words[0])
//console.log(ethBalAfter - ethBalBefore.words[0]);

//assert.equal(ethBefore - afterLiq._reserve1.words[0], ethBalAfter - ethBalBefore.words[0], "something wrong");

let priceBefore;
let price = priceOfEthBefore;

if (daiBefore <= ethBefore) {
  priceBefore = ethBefore/daiBefore; 
} else {
  priceBefore = daiBefore/ethBefore;
}


//--------------------------------------------
//--------------------------------------------
//--------------------------------------------
// set the break even price

const breakEvenPrice = 330.28

//--------------------------------------------
//--------------------------------------------


let i = 0;
// set price change to test. 1.05 is 5%
while (price > priceBefore * breakEvenPrice / priceOfEthBefore) {

  console.log('TX_NO: ', i)
  console.log('CURRENT_ETH_PRICE: ', price)

  let buyOrSell = parseInt((Math.random() * 1000)+ 1);

  if (buyOrSell < 980) {
    console.log(
      'ETH_SELL_AMT', buyOrSell
    )
    let randAmt1 = parseInt((Math.random() * 10000) + 500);

    let approveTdai1 = await tEth.approve.sendTransaction(
      route.address,
      randAmt1,
      {from: user2}
    );

    let getMin1 = await route.getAmountsOut.call(randAmt1, [tEth.address, tDai.address]);
    let ethMin1 = getMin1[1].toString();
    
    let d2 = new Date();
    let time2 = d2.getTime();
    let simpleSwap1 = await route.swapExactTokensForTokens.sendTransaction(randAmt1, ethMin1, [tEth.address, tDai.address], owner, parseInt(time2 / 1000 + 100), {from: user2});
    
    let finalLiq = await pair.getReserves.call();
    let daiAfter = finalLiq._reserve0.toString();
    let ethAfter = finalLiq._reserve1.toString();
    
    
    if (daiBefore <= ethBefore) {
      price = ethAfter / daiAfter;
    } else {
      price = daiAfter / ethAfter;
    }
    i++;
    // if (i % 20 == 0) {
    //   console.log('i', i);
    //   console.log( 'price',price);
    // }
  } else {

    console.log(
      'ETH_BUY_AMT', buyOrSell
    )
    let randAmt1 = parseInt((Math.random() * 10000) + 500);

    let approveTdai1 = await tDai.approve.sendTransaction(
      route.address,
      randAmt1,
      {from: user2}
    );

    let getMin1 = await route.getAmountsOut.call(randAmt1, [tDai.address, tEth.address]);
    let ethMin1 = getMin1[1].toString();
    
    let d2 = new Date();
    let time2 = d2.getTime();
    let simpleSwap1 = await route.swapExactTokensForTokens.sendTransaction(randAmt1, ethMin1, [tDai.address, tEth.address], owner, parseInt(time2 / 1000 + 100), {from: user2});
    
    let finalLiq = await pair.getReserves.call();
    let daiAfter = finalLiq._reserve0.toString();
    let ethAfter = finalLiq._reserve1.toString();
    
    
    if (daiBefore <= ethBefore) {
      price = ethAfter / daiAfter;
    } else {
      price = daiAfter / ethAfter;
    }
    i++;
    if (i % 20 == 0) {
      console.log('i', i);
      console.log('price', price);
    }
  }

  
}


console.log(" --- ");
console.log('daiBefore',daiBefore);
console.log('ethBefore',ethBefore);
if (daiBefore <= ethBefore) {
  console.log('oldPrice',ethBefore/daiBefore);
  console.log('poolValue',ethBefore * 2)
} else {
  console.log('oldPrice',daiBefore/ethBefore);
  console.log('poolValue',daiBefore * 2)
}



let finalLiq1 = await pair.getReserves.call();
let daiAfter1 = finalLiq1._reserve0.toString();
let ethAfter1 = finalLiq1._reserve1.toString();

console.log(" --- ");
console.log('daiAfter',daiAfter1);
console.log('ethAfter',ethAfter1);

if (daiBefore <= ethBefore) {
  let newPrice = ethAfter1/daiAfter1;
  console.log('newPrice',newPrice);
  let newValue = parseFloat(newPrice) * parseInt(daiAfter1) + parseInt(ethAfter1);
  let potentialValue = parseFloat(newPrice) * parseInt(daiBefore) + parseInt(ethBefore);
  // console.log('newValue',newValue);
  // console.log('potentialValue',potentialValue);
  // console.log('newValue / potentialValue', newValue / potentialValue);
} else {
  let newPrice = daiAfter1/ethAfter1;
  console.log('newPrice',newPrice);
  let newValue = parseFloat(newPrice) * parseInt(ethAfter1) + parseInt(daiAfter1);
  let potentialValue = parseFloat(newPrice) * parseInt(ethBefore) + parseInt(daiBefore);
  // console.log('newValue',newValue);
  // console.log('potentialValue',potentialValue);
  // console.log('newValue / potentialValue', newValue / potentialValue);
}

const daiBeforePoolValue = daiBefore * 2
const daiAfterPoolValue = daiAfter1 * 2

console.log({
  initialPrice: priceOfEthBefore,
  breakEvenPrice: breakEvenPrice,
  initialLPTPrice: daiBefore * 2,
  finalLPTPrice: daiAfter1 * 2,
  LTV: daiBeforePoolValue / daiAfterPoolValue ,
})
  
};
``
