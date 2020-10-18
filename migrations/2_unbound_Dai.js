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
  
};

