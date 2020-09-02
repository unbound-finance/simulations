// const uDai = artifacts.require("unboundDai");
// const valuing = artifacts.require("valuing_01");
// const test = artifacts.require("../contracts/testLPT.sol");
const LLC = artifacts.require("LLC_EthDai");
// const testDai = artifacts.require("TestDai");
// const testEth = artifacts.require("TestEth");

module.exports = function (deployer) {
  // deployer.deploy(valuing, "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", "0x88b2d1C22f5bACe62dcCD488C07872c6f9c486f5");
  // deployer.deploy(test);
  deployer.deploy(LLC, "0x3Da1eDF030DeC26da90B000381EEe2d962daC5cc", "0x1443398Aa8E16E0F289B12ddCf666eeC4215bF46");
  // deployer.deploy(testDai, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");
  // deployer.deploy(testEth, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");
}