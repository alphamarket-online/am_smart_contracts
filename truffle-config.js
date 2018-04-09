require('dotenv').config();
const Web3 = require("web3");
const web3 = new Web3();
const WalletProvider = require("truffle-wallet-provider");
const Wallet = require('ethereumjs-wallet');

var mainNetPrivateKey = new Buffer(process.env["MAINNET_PRIVATE_KEY"], "hex")
var mainNetWallet = Wallet.fromPrivateKey(mainNetPrivateKey);
var mainNetProvider = new WalletProvider(mainNetWallet, "https://mainnet.infura.io/");

var rinkebyPrivateKey = new Buffer(process.env["RINKEBY_PRIVATE_KEY"], "hex")
var rinkebyWallet = Wallet.fromPrivateKey(rinkebyPrivateKey);
var rinkebyProvider = new WalletProvider(rinkebyWallet, "https://rinkeby.infura.io/");

var ropstenPrivateKey = new Buffer(process.env["ROPSTEN_PRIVATE_KEY"], "hex")
var ropstenWallet = Wallet.fromPrivateKey(ropstenPrivateKey);
var ropstenProvider = new WalletProvider(ropstenWallet, "https://ropsten.infura.io/");

module.exports = {
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 9545,
      network_id: "*", // Match any network id,
      gas: 5500000
    },
    development: {
      host: "127.0.0.1",
      port: 9545,
      network_id: "*", // Match any network id,
      gas: 5500000
    },
    ganache: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id,
      gas: 5500000
    },
    coverage: {
      host: "127.0.0.1",
      port: 8545,         // <-- If you change this, also set the port option in .solcover.js.
      network_id: "*",
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    },
    rinkeby: {
      provider: rinkebyProvider,
      gas: 6500000,
      gasPrice: web3.toWei("20", "gwei"),
      network_id: "4",
    },
    ropsten: {
      provider: ropstenProvider,
      gas: 5500000,
      gasPrice: web3.toWei("20", "gwei"),
      network_id: "3",
    },
    live: {
      provider: mainNetProvider,
      gas: 5000000,
      gasPrice: web3.toWei("20", "gwei"),
      network_id: "1",
    }
  },
  mocha: {
    // reporter: 'eth-gas-reporter'
  }
};
