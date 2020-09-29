const uDai = artifacts.require("UnboundDai");
const valuing = artifacts.require("Valuing_01");
// const test = artifacts.require("../contracts/testLPT.sol");
const LLC = artifacts.require("LLC_EthDai");

// const uniFactory = artifacts.require("UniswapV2Factory")
// const uniPair = artifacts.require("UniswapV2Pair");
// const router = artifacts.require("UniswapV2Router02");

const testDai = artifacts.require("TestDai");
const testEth = artifacts.require("TestEth");

// const feeSplitter = artifacts.require("feeSplitter");
// const LPTstake = artifacts.require("unboundStaking");

const placeHoldAddr = "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762";

module.exports = async (deployer) => {
  let unbound, valuer, UBD, value, factory, tEth, tDai;
  
  // valuer = await valuing.at("0x676ff925556F26A0C8b65f8B3535d70694116354");
  
  // return deployer.deploy(testEth, placeHoldAddr).then(async (inst) => {
  //   let addLLC = await valuer.addLLC.sendTransaction("0x8D0ADC1D9C79858237F66Ef1096825c7342B18EA", 2, 400);
  //   console.log(addLLC);
  // })
  
  
  deployer.deploy(uDai, "Unbound Dollar", "UND", placeHoldAddr, placeHoldAddr).then((instance) => {
    unbound = instance.address;
    UBD = instance;
    return deployer.deploy(valuing, unbound).then((ins) => {
      valuer = ins.address;
      value = ins;
      return deployer.deploy(LLC, valuer, "0x266480906Fd0aa3edD7fF64f466ea9684b792179", "0xc30d0164Fb4c013dB62E32d48f81BeD92735d97a").then(async (data) => {
        let LLCpermission = await value.addLLC.sendTransaction(data.address, 2, 200);
        let uDaiPermission = await value.allowToken.sendTransaction(unbound);
        let setValuator = await UBD.changeValuator.sendTransaction(valuer);
        console.log(LLCpermission);
        console.log(uDaiPermission);
        console.log(setValuator);
        return deployer.deploy(LLC, valuer, "0xe8163ad34c285f7ad9b4ac0374db7fe10c67e169", "0xc30d0164Fb4c013dB62E32d48f81BeD92735d97a").then(async (data0) => {
          let secondLLC = await value.addLLC.sendTransaction(data0.address, 4, 400);
          console.log(secondLLC);
        })
        
      });
    });  
  });
}