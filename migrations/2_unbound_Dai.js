const uDai = artifacts.require("UnboundETH");

module.exports = async (deployer, network, accounts) => {
  let safu = "0xDA31A1b2c25e2F6541C53F766d4F5786b894DC51";// Safu address in the product version
  let devFund = "0x605a416Ce8B75B6e8872E98F347Ff9Ca00Df045b";// Dev fund address in the product version

  // if (network == "development" || network == "test") {
  //   safu = accounts[1];
  //   devFund = accounts[2];
  // }

  await deployer.deploy(uDai, "Unbound Ether", "uETH", safu, devFund);
};
