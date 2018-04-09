function getOwners(network) {
  if (network == "develop" || network == "development") {
    // First three truffle develop addresses
    return [
      '0x627306090abab3a6e1400e9345bc60c78a8bef57', 
      '0xf17f52151ebef6c7334fad080c5704d77216b732', 
      '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef',
    ];
  } else if (network == "ganache") {
    return [
      '0x229535De1a4698699Cb665bC7cAc08Ad9edE7a8b', 
      '0xBf6A8485E7f3193b83Ba618994fC1f3CA7Aa8973', 
      '0x039d464f6A457079b915855D5E94B8AD62d930D0',
    ];
  } else if (network == "coverage") {
    return [
      '0x06a11648ce97c1b53442c2e1627d4f9a55ef2b3e', 
      '0x1b838ddf21b8d53d5b43587964dd537360e6188a', 
      '0xf266c42f6e99904815f552fbcf0db50752a3533a',
    ];
  } else {
    return [
      '0x3dB420808dEBd79C9a884Da475b9bEa32c028275',
      '0xA8F405024dD13C3936714A0e7b4373fB0ac52B7a', 
      '0x19B4627031cD990AB0fD2E4cbe16E68aEE42C908'
    ];
  }
}

module.exports = function(deployer, network, accounts) {
  function deployIcoContract(icoContract, tokenContract, bountyWalletContract, exchangerContract, owners) {
    deployer.then(async () => {
      console.log("Start deployment of AlphaMarketICO");
      await deployer.deploy(icoContract, owners);
      var icoInstance = await icoContract.deployed();
      console.log("Deployment was finished");
      console.log("Ico address: " + icoInstance.address);

      // var icoInstance = icoContract.at("0x4D8Cf569C2fd7C436F44dEa3763C6BF967358e8D");

      console.log("Start deployment of AlphaMarketCoin");
      await deployer.deploy(tokenContract, icoInstance.address);
      var tokenInstance = await tokenContract.deployed();
      console.log("Deployment was finished");
      var tokenAddress = tokenInstance.address;
      console.log("Token address: " + tokenAddress);

      console.log("Start deployment of AlphaMarketTeamBountyWallet");
      await deployer.deploy(bountyWalletContract, owners, tokenAddress);
      var bountyWalletInstance = await bountyWalletContract.deployed();
      console.log("Deployment was finished");
      console.log("BountyWallet address: " + bountyWalletInstance.address);
      
      console.log("Start deployment of AlphaMarketCoinExchanger");
      await deployer.deploy(exchangerContract, owners, tokenAddress);
      var exchangerInstance = await exchangerContract.deployed();
      console.log("Deployment was finished");
      console.log("Exchanger address: " + exchangerInstance.address);
      
      console.log("Start setup");
      await icoInstance.setToken(tokenAddress);
      await icoInstance.setExchanger(exchangerInstance.address);
      await icoInstance.sendTokensToBountyWallet(bountyWalletInstance.address);
      console.log("Setup was finished");
    });
  }
  var testNetworks = ["develop", "development", "ganache", "coverage", "rinkeby", "ropsten"];
  if (testNetworks.includes(network)) {
    var TestAlphaMarketICO = artifacts.require("./TestAlphaMarketICO.sol");
    var AlphaMarketCoin = artifacts.require("./AlphaMarketCoin.sol");
    var AlphaMarketTeamBountyWallet = artifacts.require("./AlphaMarketTeamBountyWallet.sol");
    var AlphaMarketCoinExchanger = artifacts.require("./AlphaMarketCoinExchanger.sol");
    deployIcoContract(TestAlphaMarketICO, AlphaMarketCoin, AlphaMarketTeamBountyWallet, AlphaMarketCoinExchanger, getOwners(network));
  } else {
    var AlphaMarketICO = artifacts.require("./AlphaMarketICO.sol");
    var AlphaMarketCoin = artifacts.require("./AlphaMarketCoin.sol");
    var AlphaMarketTeamBountyWallet = artifacts.require("./AlphaMarketTeamBountyWallet.sol");
    var AlphaMarketCoinExchanger = artifacts.require("./AlphaMarketCoinExchanger.sol");
    deployIcoContract(AlphaMarketICO, AlphaMarketCoin, AlphaMarketTeamBountyWallet, AlphaMarketCoinExchanger, getOwners(network));
  }
};