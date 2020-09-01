// const uDai = artifacts.require("unboundDai");
// const valuing = artifacts.require("valuing_01");
// const test = artifacts.require("../contracts/testLPT.sol");
const LLC = artifacts.require("LLC_EthDai");

module.exports = function (deployer) {
  // deployer.deploy(valuing, "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", "0x88b2d1C22f5bACe62dcCD488C07872c6f9c486f5");
  // deployer.deploy(test);
  deployer.deploy(LLC, "0x3Da1eDF030DeC26da90B000381EEe2d962daC5cc", "0x41A5A35553F1A9Ee72f94859151dc5C115C5899C");
};
