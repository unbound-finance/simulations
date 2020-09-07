const uDai = artifacts.require("unboundDai");
const valuing = artifacts.require("valuing_01");
const test = artifacts.require("../contracts/testLPT.sol");
const LLC = artifacts.require("LLC_EthDai");
// const testDai = artifacts.require("TestDai");
// const testEth = artifacts.require("TestEth");

const feeSplitter = artifacts.require("feeSplitter");
const LPTstake = artifacts.require("unboundStaking")

module.exports = async function (deployer) {
  let unbound = await deployer.deploy(uDai, "Unbound Dai", "UDAI", 42);
  console.log(unbound);
  let feeSplit = await deployer.deploy(feeSplitter, "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", unbound.address());

  let valuing = await deployer.deploy(valuing.address(), "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", unbound.address());

  deployer.deploy(LLC, valuing.address(), "0x1443398Aa8E16E0F289B12ddCf666eeC4215bF46");
  // deployer.deploy(testDai, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");
  // deployer.deploy(testEth, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");

  
  deployer.deploy(LPTstake, "0x6BdC51c8017ABe83CB45Dc20a4d4A1060861021c" ,feeSplit.address(), unbound.address(), "0x5124d2A8e3A02f906d86803D703FD6CcCf492EF8", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
}