
const Web3 = require('web3');

const privateKey = "b56e7ab792287b00945e3a1b7235cd12843e9e1306f747bd3c1e80f6d7162246";


let web3 = new Web3(new Web3.providers.HttpProvider('https://kovan.infura.io/v3/a4dcdfe968254cd4a2a30381e3558541'))
// let wallet = new ethers.Wallet(privateKey, provider);

// let tx = {
//     to: "0x98e55b556DBA61A1D525E1c1D026340370Ef553f",
//     value: ethers.utils.parseEther('25.0')
// }

// let sendPromise = wallet.sendTransaction(tx);

// console.log(createKey.generateEthKeyPair());
web3.eth.getAccounts(console.log);