const uDai = artifacts.require("UnboundETH");
const valuer = artifacts.require("Valuing_01");
const LLC = artifacts.require("LLC_EthDai");

// const uniFactory = artifacts.require("UniswapV2Factory");
// const testDai = artifacts.require("TestDai");
// const testEth = artifacts.require("TestEth");
let UndAddress = "0x01620a1FAbCA0a24737f6dCA58bDDD3890Ba5b85"; // UND_Token_ADDRESS
let valuerAddress = "0xe01019bE929fD532f2b4f3b4867fbe37E5E511ce"; // Valuer_ADDRESS
let uETH = "0x2bf94E84b460003AaD3f944b0f3ae5C8f469b905"


// **Stablecoins**
tDAI= `0x9CD539Ac8Dca5757efAc30Cd32da20CD955e0f8B`
tUSDT= `0xc1d7957dDdA47b0B50C57cfD2A8cc34F655E77c1`
tUSDC= `0xFB841B3f7a33999692e498Cac36D358632de93e8`
tMUSDT= `0x0A9595C382cC4f6F57BD8360A13B980dBEd5313a`

// **Wrapped Tokens**
tETH= `0x24Cc33eBd310f9cBd12fA3C8E72b56fF138CA434`
tWBTC= `0xA4aBDaE0C0f861c11b353f7929fe6dB48535eaB3`

// **Other ERC_20 Tokens**

tLINK= `0x8Fd03756360EF44083a176a4f2b4a32928017417`
tTOMOE= `0x92585Cb3cA40F89F95c53bEC41D38AA2e2F676cF`
tENJ= `0x4BB9af00bb5B1582D5D4f3e91ED2F1727EC9a30D`
tUNI= `0x4563406082E5fA14f4D2b24F20647566A40F331E`


UNI_tDAI_tUSDT = `0x6f7400f3c954a873a459cc018cd53a3673db0cb0`
UNI_tDAI_tUSDC= `0xb0a2a806ec900bb9fe30bd7f6cadd35d74971542`
UNI_tUSDC_USDT= `0x78b8ba24b458fd6c74d07ae9fc903a3e7e1585d3`
UNI_tETH_tDAI= `0x54870f44414e69af7eb2f3e1e144ebb7c79325b7`
UNI_tETH_tUSDT= `0xa338ae6943c03c48f6fb6c7bff012d9206c28558`
UNI_tETH_tUSDC= `0xd9628d193fd57fe1222b5c533f40d60fc0275c78`
UNI_tTOMOE_tUSDT= `0x2142eb92e8d346893bbbd3ca713d2234bf7431ba`
UNI_tENJ_tUSDT= `0xe1fdf0958759b8023ae6234d795f9bb95f1e685e`


UNI_tWBTC_tETH=`0x7205d1091a9be1d68d11fb38e3b00ced886dfba5`

UNI_tUNI_tETH=`0x70a14516e7178e3e16ad0f58b3aed855acbed1dd`

UNI_tLINK_tETH=`0xe354c712105855705cf0b60feeac03c46da0c115`

// UNI_tWBTC_tETH= `0x7205d1091a9be1d68d11fb38e3b00ced886dfba5`

// UNI_tUNI_tETH= `0x70a14516e7178e3e16ad0f58b3aed855acbed1dd`

// UNI_tLINK_tETH= `0xe354c712105855705cf0b60feeac03c46da0c115`

module.exports = async (deployer, network, accounts) => {
  // if (LPTAddress === "") {
  //   const factory = await uniFactory.deployed();
  //   const pair = await factory.createPair.sendTransaction(testDai.address, testEth.address);
  //   LPTAddress = pair.logs[0].args.pair;
  // }

  const uETHContract = await uDai.at(uETH);
  const valueContract = await valuer.at(valuerAddress);


  console.log('============================ allow uToken ==================================')
  await valueContract.allowToken.sendTransaction(uETHContract.address);

  // console.log('============================ change Valuator ==================================')
  // await undContract.changeValuator.sendTransaction(valueContract.address);

  console.log('============================ UNI_tWBTC_tETH ==================================')
  await deployer.deploy(LLC, valueContract.address, UNI_tWBTC_tETH, tETH, uETHContract.address);
  await valueContract.addLLC.sendTransaction(LLC.address, 300000, 6000);

  console.log('============================ UNI_tUNI_tETH ==================================')
  await deployer.deploy(LLC, valueContract.address, UNI_tUNI_tETH, tETH, uETHContract.address);
  await valueContract.addLLC.sendTransaction(LLC.address, 250000, 6000);

  console.log('============================ UNI_tLINK_tETH ==================================')
  await deployer.deploy(LLC, valueContract.address, UNI_tLINK_tETH, tETH, uETHContract.address);
  await valueContract.addLLC.sendTransaction(LLC.address, 300000, 6000);

  // console.log('============================ UNI_tETH_tDAI ==================================')
  // await deployer.deploy(LLC, valueContract.address, UNI_tETH_tDAI, tDAI, undContract.address);
  // await valueContract.addLLC.sendTransaction(LLC.address, 500000, 6000);

  // console.log('============================ UNI_tETH_tUSDT ==================================')
  // await deployer.deploy(LLC, valueContract.address, UNI_tETH_tUSDT, tUSDT, undContract.address);
  // await valueContract.addLLC.sendTransaction(LLC.address, 400000, 6000);

  // console.log('============================ UNI_tETH_tUSDC ==================================')
  // await deployer.deploy(LLC, valueContract.address, UNI_tETH_tUSDC, tUSDC, undContract.address);
  // await valueContract.addLLC.sendTransaction(LLC.address, 400000, 6000);

  // console.log('============================ UNI_tTOMOE_tUSDT ==================================')
  // await deployer.deploy(LLC, valueContract.address, UNI_tTOMOE_tUSDT, tUSDT, undContract.address);
  // await valueContract.addLLC.sendTransaction(LLC.address, 300000, 6000);

  // console.log('============================ UNI_tENJ_tUSDT ==================================')
  // await deployer.deploy(LLC, valueContract.address, UNI_tENJ_tUSDT, tUSDT, undContract.address);
  // await valueContract.addLLC.sendTransaction(LLC.address, 300000, 6000);
};
