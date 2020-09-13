const uDai = artifacts.require("unboundDai");
const valuing = artifacts.require("valuing_01");
const test = artifacts.require("../contracts/testLPT.sol");
const LLC = artifacts.require("LLC_EthDai");
// const testDai = artifacts.require("TestDai");
// const testEth = artifacts.require("TestEth");

const feeSplitter = artifacts.require("feeSplitter");
const LPTstake = artifacts.require("unboundStaking");

const placeHoldAddr = "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762";

module.exports = function (deployer) {
  let unbound, valuer;
  
  deployer.deploy(LLC, "0x6f0B90B7D6CB0BFca427475F18C34d30EE99fC14", "0x266480906fd0aa3edd7ff64f466ea9684b792179", "0xc30d0164Fb4c013dB62E32d48f81BeD92735d97a");

  // deployer.deploy(LLC, "0x32c660Ce65b5751433f98d0Fe0f94E94F4CC972E", "0x1443398Aa8E16E0F289B12ddCf666eeC4215bF46", 0);
  // deployer.deploy(uDai, "Unbound Dai", "UDAI", 42, placeHoldAddr, placeHoldAddr).then((instance) => {
  //   unbound = instance.address;
  //   return deployer.deploy(valuing, unbound).then((ins) => {
  //     valuer = ins.address;
      
  //     return deployer.deploy(LLC, valuer, "0x266480906fd0aa3edd7ff64f466ea9684b792179", 0);
      
  //   });
    
    
  // });
  

  // let valuing = await deployer.deploy(valuing, "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", unbound.address());

  // deployer.deploy(LLC, valuing.address(), "0x1443398Aa8E16E0F289B12ddCf666eeC4215bF46");
  // // deployer.deploy(testDai, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");
  // // deployer.deploy(testEth, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");

  
  // deployer.deploy(LPTstake, "0x6BdC51c8017ABe83CB45Dc20a4d4A1060861021c" ,feeSplit.address(), unbound.address(), "0x5124d2A8e3A02f906d86803D703FD6CcCf492EF8", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
}