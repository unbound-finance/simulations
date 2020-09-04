// const uDai = artifacts.require("unboundDai");
// const valuing = artifacts.require("valuing_01");
// const test = artifacts.require("../contracts/testLPT.sol");
// const LLC = artifacts.require("LLC_EthDai");
// const testDai = artifacts.require("TestDai");
// const testEth = artifacts.require("TestEth");

// const feeSplitter = artifacts.require("feeSplitter");
const LPTstake = artifacts.require("unboundStaking")

module.exports = function (deployer) {
  // deployer.deploy(uDai, "Unbound Dai", "UDAI")
  // deployer.deploy(valuing, "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", "0xbE803e975157179Ad35D91461eE2C5b262DA65a1");
  // deployer.deploy(test);
  // deployer.deploy(LLC, "0xC5093C20F155375E470435b1D36671758E133D46", "0x1443398Aa8E16E0F289B12ddCf666eeC4215bF46");
  // deployer.deploy(testDai, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");
  // deployer.deploy(testEth, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");

  // deployer.deploy(feeSplitter, "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", "0xbE803e975157179Ad35D91461eE2C5b262DA65a1");
  deployer.deploy(LPTstake, ,"0x4541946E4168d7809a870fF74eBa2024a395199F", "0xbE803e975157179Ad35D91461eE2C5b262DA65a1")
}