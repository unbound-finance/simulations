const uDai = artifacts.require("UnboundDai");
const valuing = artifacts.require("Valuing_01");
// const test = artifacts.require("../contracts/testLPT.sol");
const LLC = artifacts.require("LLC_EthDai");
const LLC1 = artifacts.require("LLC_LinkDai");

const uniFactory = artifacts.require("UniswapV2Factory");
const uniPair = artifacts.require("UniswapV2Pair");
const router = artifacts.require("UniswapV2Router02");

const testDai = artifacts.require("TestDai");
const testEth = artifacts.require("TestEth");
const testLink = artifacts.require("TestLink");

// const feeSplitter = artifacts.require("feeSplitter");
// const LPTstake = artifacts.require("unboundStaking");

const weth = artifacts.require("WETH9");

const tester = "0x74a084d3c8a6FF8889988aba43BD5EDbd265665A";

module.exports = async (deployer, network, accounts) => {
  let safu = "0x";
  let devFund = "0x";

  if (network == "development" || network == "test") {
    safu = accounts[1];
    devFund = accounts[2];
  }

  await deployer.deploy(uDai, "Unbound Dollar", "UND", safu, devFund);
  await deployer.deploy(valuing, uDai.address);
  await deployer.deploy(testDai, tester, "5777");
  await deployer.deploy(testEth, tester);
  await deployer.deploy(testLink, tester);
  if (network == "development" || network == "test") {
    const feeToSetter = accounts[0];
    await deployer.deploy(uniFactory, feeToSetter);
    await deployer.deploy(weth);
    await deployer.deploy(router, uniFactory.address, weth.address);
  }
  // let unbound, valuer, factory, tEth, tDai, route;

  // deployer.deploy(uDai, "Unbound Dollar", "UND", placeHoldAddr, placeHoldAddr).then((instance) => {
  //   unbound = instance.address;
  //   UBD = instance;
  //   return deployer.deploy(valuing, unbound).then((ins) => {
  //     valuer = ins.address;
  //     return deployer.deploy(uniFactory, placeHoldAddr).then((res) => {

  //       return deployer.deploy(testDai, "0x74a084d3c8a6FF8889988aba43BD5EDbd265665A", "5777").then((resi) => {
  //         return deployer.deploy(testEth, "0x74a084d3c8a6FF8889988aba43BD5EDbd265665A").then( async (result) => {
  //           return deployer.deploy(testLink, "0x74a084d3c8a6FF8889988aba43BD5EDbd265665A").then( async (resi) => {
  //             factory = await uniFactory.deployed();
  //             tEth = await testEth.deployed();
  //             tDai = await testDai.deployed();
  //             return deployer.deploy(weth).then((wrap) => {
  //               let wethAddr = wrap.address;
  //               return deployer.deploy(router, factory.address, wethAddr);
  //               });
  //             })

  //           });

  //           // const pairAddr = await factory.createPair.sendTransaction(tEth.address, tDai.address);
  //           // let pairObj = await uniPair.at(pairAddr.logs[0].address);
  //           // return deployer.deploy(LLC, valuer, pairAddr.logs[0].address, 0);
  //         });

  //       })
  //     })
  //   });
};

// });

// let valuing = await deployer.deploy(valuing, "0x276673170227Ed4f09d6b9f4Ba9b8F4777d99762", unbound.address());

// deployer.deploy(LLC, valuing.address(), "0x1443398Aa8E16E0F289B12ddCf666eeC4215bF46");
// // deployer.deploy(testDai, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");
// // deployer.deploy(testEth, "0x464499A3D0a578448f4F4B6e223A97497cFDB8d6");

// deployer.deploy(LPTstake, "0x6BdC51c8017ABe83CB45Dc20a4d4A1060861021c" ,feeSplit.address(), unbound.address(), "0x5124d2A8e3A02f906d86803D703FD6CcCf492EF8", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
