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

// const feeSplitter = artifacts.require("feeSplitter");
// const LPTstake = artifacts.require("unboundStaking");

const weth = artifacts.require("WETH9");

const tester = "0x74a084d3c8a6FF8889988aba43BD5EDbd265665A";

module.exports = async (deployer, network, accounts) => {
  // let safu = "0x";
  // let devFund = "0x";

  // if (network == "development" || network == "test") {
  //   safu = accounts[1];
  //   devFund = accounts[2];
  // }

  // await deployer.deploy(uDai, "Unbound Dollar", "UND", safu, devFund);
  // await deployer.deploy(valuing, uDai.address);
  // await deployer.deploy(testDai, tester, "5777");
  // await deployer.deploy(testDai13, tester, "5777");
  // await deployer.deploy(testDai19, tester, "5777");
  // await deployer.deploy(testEth, tester);
  // await deployer.deploy(testLink, tester);
  // if (network == "development" || network == "test") {
  //   const feeToSetter = accounts[0];
  //   await deployer.deploy(uniFactory, feeToSetter);
  //   await deployer.deploy(weth);
  //   await deployer.deploy(router, uniFactory.address, weth.address);
  // }
  let unbound, valuer, factory, tEth, tDai, route;

  let LPT = "Liquidity-Pool-Token-ADDRESS-HERE"
  let stablecoin = "Stablecoin-ADDRESS-HERE"

  deployer.deploy(uDai, "Unbound Dollar", "UND", placeHoldAddr, placeHoldAddr).then((instance) => {
    unbound = instance.address;
    UBD = instance;
    return deployer.deploy(valuing, unbound).then((ins) => {
      valuer = ins.address;
      return deployer.deploy(LLC, valuer, LPT, stablecoin).then( async (resu) => {
        unbound = await uDai.deployed();
        valuer = await valuing.deployed();
        let permissionLLC = await valuer.addLLC.sendTransaction(
          resu.address,
          loanRate,
          feeRate
        );
        let permissionUdai = await valuer.allowToken.sendTransaction(
          unbound.address
        );
  
        let newValuator = await unbound.changeValuator.sendTransaction(
          valuer.address
        );
      });  
    })
  });
};

// });

// let valuing = await deployer.deploy(valuing, "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", unbound.address());

// deployer.deploy(LLC, valuing.address(), "0x1443398Aa8E16E0F289B12ddCf666eeC4215bF46");
// // deployer.deploy(testDai, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");
// // deployer.deploy(testEth, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");

// deployer.deploy(LPTstake, "0x6BdC51c8017ABe83CB45Dc20a4d4A1060861021c" ,feeSplit.address(), unbound.address(), "0x5124d2A8e3A02f906d86803D703FD6CcCf492EF8", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
