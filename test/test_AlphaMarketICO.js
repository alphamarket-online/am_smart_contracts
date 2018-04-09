const TestAlphaMarketICO = artifacts.require("./TestAlphaMarketICO.sol");
const AlphaMarketICO = artifacts.require("./AlphaMarketICO.sol");
const AlphaMarketCoin = artifacts.require("./AlphaMarketCoin.sol");
const AlphaMarketTeamBountyWallet = artifacts.require("./AlphaMarketTeamBountyWallet.sol");
const AlphaMarketCoinExchanger = artifacts.require("./AlphaMarketCoinExchanger.sol");

const seconds = 1;
const minutes = 60 * seconds;
const hours = 60 * minutes;
const days = 24 * hours;
const weeks = 7 * days;
const years = 365 * days;

contract('TestAlphaMarketICO', async (accounts) => {
  const roles = {
    cheifOwner: accounts[0],
    secondLineOwners: [
      accounts[1],
      accounts[2],
    ],
    investors: [
      accounts[3],
      accounts[4],
      accounts[5],
      accounts[6],
      accounts[7],
      accounts[8],
      accounts[9],
    ]
  }

  async function getDeployedInstance() {
    console.log("Await for get deployed contract AlphaMarketICO");
    let instance = await TestAlphaMarketICO.deployed();
    console.log("AlphaMarketICO address: " + instance.address);

    console.log("Await for get deployed contract AlphaMarketTeamBountyWallet");
    // Workaround truffle problem
    let instanceBountyWallet = await AlphaMarketTeamBountyWallet.deployed();
    // var instanceBountyWallet = AlphaMarketTeamBountyWallet.at(await instance.bountyWallet());
    console.log("AlphaMarketICO address: " + instanceBountyWallet.address);

    console.log("Await for get deployed contract AlphaMarketCoinExchanger");
    // Workaround truffle problem
    let instanceExchanger = await AlphaMarketCoinExchanger.deployed();
    // var instanceExchanger = AlphaMarketTeamBountyWallet.at(await instance.exchanger());
    console.log("AlphaMarketICO address: " + instanceExchanger.address);
    
    console.log("Getting contract basic info");
    var token = await AlphaMarketCoin.deployed();
    console.log("AlphaMarketCoin address:" + token.address);

    var startTime = await instance.startTime();
    console.log("ICO start time is " + startTime.toNumber());

    console.log("Setting current time");
    await instance.setCurrentTime(startTime.minus(2 * weeks), {from: roles.cheifOwner});

    var currentTime = await instance.testTime();
    console.log("Current time was set to " + currentTime.toNumber());
    
    console.log("AlphaMarketICO instance with all necessary information was prepased");
    return [instance, token, instanceBountyWallet, instanceExchanger, startTime];
  }

  async function getNewInstance(roles) {
    console.log("Create new contract AlphaMarketICO");
    let instance = await TestAlphaMarketICO.new([
      roles.cheifOwner, 
      roles.secondLineOwners[0], 
      roles.secondLineOwners[1]
    ]);
    console.log("AlphaMarketICO address: " + instance.address);

    console.log("Getting contract basic info");
    var token = await AlphaMarketCoin.new(instance.address);
    var tokenAddress = token.address;
    console.log("AlphaMarketCoin address:" + tokenAddress);

    var startTime = await instance.startTime();
    console.log("ICO start time is " + startTime.toNumber());

    console.log("Setting current time");
    await instance.setCurrentTime(startTime.minus(2 * weeks), {from: roles.cheifOwner});

    var currentTime = await instance.testTime();
    console.log("Current time was set to " + currentTime.toNumber());

    console.log("Create new contract AlphaMarketTeamBountyWallet");
    let instanceBountyWallet = await AlphaMarketTeamBountyWallet.new([
      roles.cheifOwner, 
      roles.secondLineOwners[0], 
      roles.secondLineOwners[1]
    ], tokenAddress);
    console.log("AlphaMarketICO address: " + instanceBountyWallet.address);

    console.log("Create new contract AlphaMarketCoinExchanger");
    let instanceExchanger = await AlphaMarketCoinExchanger.new([
      roles.cheifOwner, 
      roles.secondLineOwners[0], 
      roles.secondLineOwners[1]
    ], tokenAddress);
    console.log("AlphaMarketICO address: " + instanceExchanger.address);
    
    await instance.setToken(tokenAddress);
    await instance.sendTokensToBountyWallet(instanceBountyWallet.address);
    await instance.setExchanger(instanceExchanger.address);
    
    console.log("AlphaMarketICO instance with all necessary information was prepased");
    return [instance, token, instanceBountyWallet, instanceExchanger, startTime];
  }

  async function performOperationByOwners(op) {
    console.log("Start operation from cheif");
    await op({from: roles.cheifOwner});
    console.log("Start operation from second owner");
    await op({from: roles.secondLineOwners[0]});
  }

  async function checkCorrectness(ico, token, bountyWallet, exchanger) {
    // Check early access to token
    assert.equal(await token.controller(), ico.address);
    var earlyAccessValue1 = await token.earlyAccess(ico.address);
    assert.equal(earlyAccessValue1, true);
    var earlyAccessValue2 = await token.earlyAccess(roles.investors[0]);
    assert.equal(earlyAccessValue2, false);
    var earlyAccessValue3 = await token.earlyAccess(roles.cheifOwner);
    assert.equal(earlyAccessValue3, false);
    var earlyAccessValue4 = await token.earlyAccess(bountyWallet.address);
    assert.equal(earlyAccessValue4, true);

    // Check initial balances
    var icoBalance = await token.balanceOf(ico.address);
    var bountyWalletBalance = await token.balanceOf(bountyWallet.address);
    var totalSupply = await token.totalSupply();
    assert(totalSupply.equals(icoBalance.plus(bountyWalletBalance)));
    assert(icoBalance.equals(totalSupply.mul(80).div(100)));

    var tokensToSold = await ico.tokensToSold();
    assert(tokensToSold.equals(totalSupply.mul(60).div(100)))

    // Check exchanger set correctly
    var exchagerAddress = await ico.exchanger();
    assert.equal(exchagerAddress, exchanger.address);

    // Check required confirmations count
    var requiredCount = await ico.m_required();
    assert.equal(requiredCount.toNumber(), 2);
  }

  async function assertThrowsAsynchronously(test_func, error, msg) {
    try {
      await test_func();
    } catch(e) {
      if ((!error || e instanceof error) && (!msg || e.message.includes(msg))) {
        return;
      }
      throw new Error("Catched error " + 
        (e.name + " (" + e.message + ") ") + 
        "doesn't match with expected" + 
        (error ? " " + error.name : "") + (msg ? " (" + msg + ")" : ""));
    }
    throw new Error("No exceptions thrown");
  }

  it("Deployment correctness", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getDeployedInstance();
    checkCorrectness(ico, token, bountyWallet, exchanger);
  });

  it("New test instance correctness", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await checkCorrectness(ico, token, bountyWallet, exchanger);
  });

  it("Reward contributors", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    
    var totalSupply = await token.totalSupply();
    var icoBalance = await token.balanceOf(ico.address);

    // Check incorrect reward contributors - value less than necessary
    await assertThrowsAsynchronously(async function() {
      await performOperationByOwners(ico.rewardContributors.bind(null, [
        roles.cheifOwner, 
        roles.secondLineOwners[0], 
        roles.secondLineOwners[1],
        roles.investors[0],
      ], [
        totalSupply.div(20), 
        totalSupply.div(25), 
        totalSupply.div(25),
        totalSupply.div(25),
      ]));
    }, Error, "VM Exception while processing transaction: revert");
    // Check incorrect reward contributors - value more than allowed
    await assertThrowsAsynchronously(async function() {
      await performOperationByOwners(ico.rewardContributors.bind(null, [
        roles.cheifOwner, 
        roles.secondLineOwners[0], 
        roles.secondLineOwners[1],
        roles.investors[0],
      ], [
        totalSupply.div(5), 
        totalSupply.div(100), 
        totalSupply.div(100),
        totalSupply.div(100),
      ]));
    }, Error, "VM Exception while processing transaction: revert");
    // Check incorrect reward contributors - sizes didn't match
    await performOperationByOwners(ico.rewardContributors.bind(null, [
      roles.cheifOwner, 
      roles.secondLineOwners[0], 
      roles.secondLineOwners[1],
      roles.investors[0],
      roles.investors[1],
    ], [
      totalSupply.div(20), 
      totalSupply.div(20), 
      totalSupply.div(20),
      totalSupply.div(20),
    ]));
    // Check incorrect reward contributors - sizes didn't match
    await performOperationByOwners(ico.rewardContributors.bind(null, [
      roles.cheifOwner, 
      roles.secondLineOwners[0], 
      roles.secondLineOwners[1],
    ], [
      totalSupply.div(20), 
      totalSupply.div(20), 
      totalSupply.div(20),
      totalSupply.div(20),
    ]));
    assert.equal(await ico.isContributorsRewarded(), false);
    // Check incorrect reward contributors - incorrect address
    await assertThrowsAsynchronously(async function() {
      await performOperationByOwners(ico.rewardContributors.bind(null, [
        roles.cheifOwner, 
        "0x0", 
        roles.secondLineOwners[1],
        roles.investors[0],
      ], [
        totalSupply.div(20), 
        totalSupply.div(20), 
        totalSupply.div(20),
        totalSupply.div(20),
      ]));
    }, Error, "VM Exception while processing transaction: revert");
    // Check balances
    var icoBalance = await token.balanceOf(ico.address);
    var totalSupply = await token.totalSupply();
    assert(icoBalance.equals(totalSupply.mul(80).div(100)));

    // Check incorrect reward contributors - Correct case
    await performOperationByOwners(ico.rewardContributors.bind(null, [
        roles.cheifOwner, 
        roles.secondLineOwners[0], 
        roles.secondLineOwners[1],
        roles.investors[0],
      ], [
        totalSupply.div(20), 
        totalSupply.div(20), 
        totalSupply.div(20),
        totalSupply.div(20),
    ]));
    // Check balances
    var icoBalance = await token.balanceOf(ico.address);
    var totalSupply = await token.totalSupply();
    assert(icoBalance.equals(totalSupply.mul(60).div(100)));

    // Check incorrect reward contributors - Correct case it was already done before
    await performOperationByOwners(ico.rewardContributors.bind(null, [
        roles.cheifOwner, 
        roles.secondLineOwners[0], 
        roles.secondLineOwners[1],
        roles.investors[0],
      ], [
        totalSupply.div(20), 
        totalSupply.div(20), 
        totalSupply.div(20),
        totalSupply.div(20),
    ]));
    // Check balances
    var icoBalance = await token.balanceOf(ico.address);
    var totalSupply = await token.totalSupply();
    assert(icoBalance.equals(totalSupply.mul(60).div(100)));
  });

  it("Functionality before ICO start", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    
    await assertThrowsAsynchronously(async function() {
      await ico.buyTokens({from: roles.investors[2], value: web3.toWei(1, 'ether')});
    }, Error, "VM Exception while processing transaction: revert");

    await assertThrowsAsynchronously(async function() {
      await ico.withdrawRefund({from: roles.investors[2]});
    }, Error, "VM Exception while processing transaction: revert");

    await assertThrowsAsynchronously(async function() {
      await ico.transferEther(roles.investors[2], web3.toWei(1, 'ether'), {from: roles.investors[2]});
    }, Error, "VM Exception while processing transaction: revert");

    await assertThrowsAsynchronously(async function() {
      await ico.failICO({from: roles.investors[2]});
    }, Error, "VM Exception while processing transaction: revert");
  });

  it("ICO start", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    
    await ico.setCurrentTime(startTime, {from: roles.cheifOwner});

    assert.equal(await ico.icoState(), 0);
    await ico.updateState({from: roles.investors[3]});
    assert.equal(await ico.icoState(), 1);
    await ico.buyTokens({from: roles.investors[2], value: web3.toWei(100, 'finney')});
    balanceInvestor2 = await token.balanceOf(roles.investors[2]);
    assert(balanceInvestor2.gt(new web3.BigNumber('100000000000000000')));
    
    balanceInvestor1 = await token.balanceOf(roles.investors[1]);
    assert(balanceInvestor1.equals(new web3.BigNumber('0')));

    assert.equal(await web3.eth.getBalance(ico.address), web3.toWei(100, 'finney'));

    await ico.setCurrentTime(startTime.plus(1 * weeks), {from: roles.cheifOwner});
    await ico.buyTokens({from: roles.investors[1], value: web3.toWei(100, 'finney')});
    assert.equal(await ico.icoState(), 1);

    assert.equal(await ico.investments(roles.investors[1]), web3.toWei(100, 'finney'));
    assert.equal(await ico.investments(roles.investors[2]), web3.toWei(100, 'finney'));

    balanceInvestor1 = await token.balanceOf(roles.investors[1]);
    assert(balanceInvestor1.gt(new web3.BigNumber('100000000000000000')));
    assert(balanceInvestor2.gt(balanceInvestor1));
    assert.equal(await web3.eth.getBalance(ico.address), web3.toWei(200, 'finney'));

    await web3.eth.sendTransaction({
      from: roles.investors[5], 
      to: ico.address, 
      value: web3.toWei(10, 'finney'),
      gas: 5000000
    });

    assert((await token.balanceOf(roles.investors[5])).gt(web3.toWei(10000, 'finney')));
  });

  it("Withdraw investment", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.cheifOwner});

    assert.equal(await ico.icoState(), 0);
    var balanceBeforeInvestment = await web3.eth.getBalance(roles.investors[4]);
    const receiptTx1 = await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});

    assert.equal(await ico.investments(roles.investors[4]), web3.toWei(100, 'finney'));
    var balanceAfterInvestment = await web3.eth.getBalance(roles.investors[4]);
    assert(balanceBeforeInvestment.gt(balanceAfterInvestment.plus(web3.toWei(100, 'finney'))));
    
    var gasUsed = receiptTx1.receipt.gasUsed;
    console.log(`GasUsed: ${receiptTx1.receipt.gasUsed}`);
    
    var tx = await web3.eth.getTransaction(receiptTx1.tx);
    var gasPrice = tx.gasPrice;
    console.log(`GasPrice: ${tx.gasPrice}`);
    var gasCostTx1 = new web3.BigNumber(gasUsed).mul(gasPrice);
    assert(balanceBeforeInvestment.eq(balanceAfterInvestment.plus(
      web3.toWei(100, 'finney')).plus(gasCostTx1)));

    await performOperationByOwners(ico.failICO);
    const receiptTx2 = await ico.withdrawRefund({from: roles.investors[4]});
    
    gasUsed = receiptTx2.receipt.gasUsed;
    console.log(`GasUsed: ${receiptTx2.receipt.gasUsed}`);
    
    tx = await web3.eth.getTransaction(receiptTx2.tx);
    gasPrice = tx.gasPrice;
    console.log(`GasPrice: ${tx.gasPrice}`);

    var gasCostTx2 = new web3.BigNumber(gasUsed).mul(gasPrice);
    var balanceAfterWithdraw = await web3.eth.getBalance(roles.investors[4]);

    assert(balanceBeforeInvestment.eq(balanceAfterWithdraw.plus(
      gasCostTx1).plus(gasCostTx2)));
  });

  it("Withdraw investment in double invest case", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.cheifOwner});

    assert.equal(await ico.icoState(), 0);
    var balanceBeforeInvestment = await web3.eth.getBalance(roles.investors[4]);

    const receiptTx1 = await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});

    assert.equal(await ico.investments(roles.investors[4]), web3.toWei(100, 'finney'));
    var balanceAfterInvestment = await web3.eth.getBalance(roles.investors[4]);
    assert(balanceBeforeInvestment.gt(balanceAfterInvestment.plus(web3.toWei(100, 'finney'))));
    
    var gasUsed = receiptTx1.receipt.gasUsed;
    console.log(`GasUsed: ${receiptTx1.receipt.gasUsed}`);
    
    var tx = await web3.eth.getTransaction(receiptTx1.tx);
    var gasPrice = tx.gasPrice;
    console.log(`GasPrice: ${tx.gasPrice}`);
    var gasCostTx1 = new web3.BigNumber(gasUsed).mul(gasPrice);

    assert(balanceBeforeInvestment.eq(balanceAfterInvestment.plus(
      web3.toWei(100, 'finney')).plus(gasCostTx1)));

    const receiptTx2 = await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});

    assert.equal(await ico.investments(roles.investors[4]), web3.toWei(200, 'finney'));
    var balanceAfterInvestment = await web3.eth.getBalance(roles.investors[4]);
    assert(balanceBeforeInvestment.gt(balanceAfterInvestment.plus(web3.toWei(200, 'finney'))));
    
    var gasUsed = receiptTx2.receipt.gasUsed;
    console.log(`GasUsed: ${receiptTx2.receipt.gasUsed}`);
    
    var tx = await web3.eth.getTransaction(receiptTx2.tx);
    var gasPrice = tx.gasPrice;
    console.log(`GasPrice: ${tx.gasPrice}`);
    var gasCostTx2 = new web3.BigNumber(gasUsed).mul(gasPrice);

    assert(balanceBeforeInvestment.eq(balanceAfterInvestment.plus(
      web3.toWei(200, 'finney')).plus(gasCostTx1).plus(gasCostTx2)));

    await assertThrowsAsynchronously(async function(){
      await ico.withdrawRefund.call({from: roles.investors[4]});
    });
    await performOperationByOwners(ico.failICO);
    assert.equal(await ico.icoState(), 3);
    const receiptTx3 = await ico.withdrawRefund({from: roles.investors[4]});
    
    gasUsed = receiptTx3.receipt.gasUsed;
    console.log(`GasUsed: ${receiptTx3.receipt.gasUsed}`);
    
    tx = await web3.eth.getTransaction(receiptTx3.tx);
    gasPrice = tx.gasPrice;
    console.log(`GasPrice: ${tx.gasPrice}`);

    var gasCostTx3 = new web3.BigNumber(gasUsed).mul(gasPrice);
    var balanceAfterWithdraw = await web3.eth.getBalance(roles.investors[4]);

    assert(balanceBeforeInvestment.eq(balanceAfterWithdraw.plus(
      gasCostTx1).plus(gasCostTx2).plus(gasCostTx3)));

    await assertThrowsAsynchronously(async function(){
      await ico.withdrawRefund.call({from: roles.investors[4]});
    });

    await assertThrowsAsynchronously(async function(){
      await ico.withdrawRefund.call({from: roles.investors[6]});
    });
  });

  it("Update state", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.cheifOwner});

    assert.equal(await ico.icoState(), 0);

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});

    var tokenBalanceBeforeTransfer = await token.balanceOf(roles.investors[4]);
    assert(tokenBalanceBeforeTransfer.gt(web3.toWei(100, 'finney')));

    await assertThrowsAsynchronously(async function(){
      await token.transfer(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.investors[4]});
    });

    assert.equal(await ico.icoState(), 1);
    await ico.setCurrentTime(startTime.plus(new web3.BigNumber(12 * weeks)), {from: roles.cheifOwner});
    await ico.updateState({from: roles.cheifOwner});
    assert.equal(await ico.icoState(), 2);

    await token.transfer(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.investors[4]});
    var tokenBalanceAfterTransfer = await token.balanceOf(roles.investors[4]);
    var tokenBalanceReceiver = await token.balanceOf(roles.investors[0]);

    assert(tokenBalanceBeforeTransfer.eq(tokenBalanceAfterTransfer.plus(web3.toWei(100, 'finney'))));
    assert(tokenBalanceReceiver.eq(web3.toWei(100, 'finney')));

    var balanceIcoBeforeEnd = await token.balanceOf(ico.address);

    await ico.setCurrentTime(startTime.plus(new web3.BigNumber(24 * weeks)), {from: roles.cheifOwner});
    await assertThrowsAsynchronously(async function(){
      await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    });
    await ico.updateState({from: roles.investors[2]});
    assert.equal(await ico.icoState(), 4);
    assert((await token.balanceOf(ico.address)).eq(new web3.BigNumber(0)));
    assert((await token.balanceOf(exchanger.address)).eq(balanceIcoBeforeEnd));
  });

  it("Hard cap reached", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.cheifOwner});
    await ico.setHardCap(web3.toWei(100, 'finney'), {from: roles.cheifOwner});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});

    await assertThrowsAsynchronously(async function(){
      await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    });

    await ico.updateState({from: roles.investors[2]});
    assert.equal(await ico.icoState(), 4);
  });

  it("Total sold reached", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.cheifOwner});
    await ico.setTotalSold(web3.toWei(599999900, 'ether'), {from: roles.cheifOwner});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});

    await assertThrowsAsynchronously(async function(){
      await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    });

    await ico.updateState({from: roles.investors[2]});
    assert.equal(await ico.icoState(), 4);
  });

  it("Transfer ether two acceptances", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    await performOperationByOwners(ico.transferEther.bind(null, "0x0", web3.toWei(10, 'finney')));
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    var balanceBeforeTransfer = await web3.eth.getBalance(roles.investors[0]);

    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[1]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    await assertThrowsAsynchronously(async function(){
      await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.investors[4]});
    });
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    console.log(await web3.eth.getBalance(ico.address));
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(0, 'finney')));

    assert(balanceBeforeTransfer.eq((await web3.eth.getBalance(roles.investors[0])).minus(web3.toWei(100, 'finney'))));
  });

  it("Transfer ether three acceptances", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    var balanceBeforeTransfer = await web3.eth.getBalance(roles.investors[0]);

    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[1]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[0]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    await assertThrowsAsynchronously(async function(){
      await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.investors[4]});
    });
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    console.log(await web3.eth.getBalance(ico.address));
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(0, 'finney')));

    assert(balanceBeforeTransfer.eq((await web3.eth.getBalance(roles.investors[0])).minus(web3.toWei(100, 'finney'))));
  });

  it("Ownership: Change owner", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.changeOwner(roles.cheifOwner, roles.investors[0], {from: roles.cheifOwner});
    
    await ico.changeOwner(roles.cheifOwner, roles.investors[0], {from: roles.secondLineOwners[0]});

    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[0]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.investors[0]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(0, 'finney')));
  });

  it("Ownership: Change required", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.changeRequirement(4, {from: roles.cheifOwner});
    await ico.changeRequirement(4, {from: roles.secondLineOwners[0]});
    
    await ico.changeRequirement(3, {from: roles.cheifOwner});
    await ico.changeRequirement(3, {from: roles.secondLineOwners[0]});
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[0]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[1]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(0, 'finney')));
  });

  it("Ownership: Add owner", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.addOwner(roles.investors[0], {from: roles.cheifOwner});
    await ico.addOwner(roles.investors[0], {from: roles.secondLineOwners[0]});
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.investors[0]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(0, 'finney')));
  });

  it("Ownership: Remove owner cheif", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.removeOwner(roles.cheifOwner, {from: roles.cheifOwner});
    await ico.removeOwner(roles.cheifOwner, {from: roles.secondLineOwners[0]});
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[1]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    await assertThrowsAsynchronously(async function(){
      await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    });
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[0]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(0, 'finney')));
  });

  it("Ownership: Remove owner secondline", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.removeOwner(roles.investors[2], {from: roles.cheifOwner});
    await ico.removeOwner(roles.investors[2], {from: roles.secondLineOwners[0]});
    
    await ico.removeOwner(roles.secondLineOwners[1], {from: roles.cheifOwner});
    await ico.removeOwner(roles.secondLineOwners[1], {from: roles.secondLineOwners[0]});
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    await assertThrowsAsynchronously(async function(){
      await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[1]});
    });
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[0]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(0, 'finney')));
  });

  it("Ownership: Revoke", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(100, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    var receipt = await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[0]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    var tx = await web3.eth.getTransaction(receipt.tx);
    console.log(tx.input);

    txHash = web3.sha3(tx.input, {encoding: 'hex'});
    assert.equal(await ico.hasConfirmed(txHash,  roles.investors[2]), false);
    assert.equal(await ico.hasConfirmed(txHash,  roles.secondLineOwners[0]), true);

    await ico.revoke(txHash, {from: roles.secondLineOwners[0]});
    assert.equal(await ico.hasConfirmed(txHash,  roles.secondLineOwners[0]), false);
    
    var receipt = await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.cheifOwner});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));
    
    var receipt = await ico.transferEther(roles.investors[0], web3.toWei(100, 'finney'), {from: roles.secondLineOwners[1]});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(0, 'finney')));
  });

  it("Referal system", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    const transactionData = ico.buyTokensWithRef.request(roles.investors[0]);

    const txId = await web3.eth.sendTransaction({
      from: roles.investors[4], 
      to: ico.address, 
      value: web3.toWei(100, 'finney'), 
      data: transactionData.params[0].data,
      gas: 5000000
    });

    var receipt = await web3.eth.getTransactionReceipt(txId);
    console.log(receipt);
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    assert((await token.balanceOf(roles.investors[4])).eq(web3.toWei(3333360, 'finney')));
    assert((await token.balanceOf(roles.investors[0])).eq(web3.toWei(138890, 'finney')));
  });

  it("Referal system at 12 week", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});
    await ico.updateState();
    await ico.setCurrentTime(startTime.plus(12*weeks), {from: roles.secondLineOwners[1]});

    const transactionData = ico.buyTokensWithRef.request(roles.investors[0]);

    const txId = await web3.eth.sendTransaction({
      from: roles.investors[4], 
      to: ico.address, 
      value: web3.toWei(100, 'finney'), 
      data: transactionData.params[0].data,
      gas: 5000000
      // gas: 180000
    });

    var receipt = await web3.eth.getTransactionReceipt(txId);
    console.log(receipt);
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    assert((await token.balanceOf(roles.investors[4])).eq(web3.toWei(1250000, 'finney')));
    assert((await token.balanceOf(roles.investors[0])).eq(web3.toWei(62500, 'finney')));
  });

  it("Too small investment", async () => {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime, {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[4], value: web3.toWei(10, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(10, 'finney')));
    
    assertThrowsAsynchronously(async function() {
      await ico.buyTokens({from: roles.investors[4], value: web3.toWei(9, 'finney')});
    }, Error, "VM Exception while processing transaction: revert");
  });

  async function pricesCheck(week, price, bonus) {
    const [ico, token, bountyWallet, exchanger, startTime] = await getNewInstance(roles);
    await ico.setCurrentTime(startTime.plus(week * weeks), {from: roles.secondLineOwners[1]});

    await ico.buyTokens({from: roles.investors[week % 6], value: web3.toWei(100, 'finney')});
    assert((await web3.eth.getBalance(ico.address)).eq(web3.toWei(100, 'finney')));

    var realPrice = (((1.0 + bonus/100.0) * web3.toWei(100, 'finney'))/(await token.balanceOf(roles.investors[week % 6])).toNumber()).toFixed(8)
    console.log(realPrice);
    assert.equal(realPrice, price.toFixed(8));
  }

  it("Prices", async () => {
    var priceTable = [
      {week: 0, price: 0.000036, bonus: 20},
      {week: 1, price: 0.00004, bonus: 18},
      {week: 2, price: 0.000044, bonus: 16},
      {week: 3, price: 0.000048, bonus: 14},
      {week: 4, price: 0.000052, bonus: 12},
      {week: 5, price: 0.000056, bonus: 10},
      {week: 6, price: 0.000060, bonus: 8},
      {week: 7, price: 0.000064, bonus: 6},
      {week: 8, price: 0.000068, bonus: 4},
      {week: 9, price: 0.000072, bonus: 3},
      {week: 10, price: 0.000076, bonus: 2},
      {week: 11, price: 0.00008, bonus: 1},
      {week: 12, price: 0.00008, bonus: 0},
      {week: 13, price: 0.00008, bonus: 0},
      {week: 15, price: 0.00008, bonus: 0},
      {week: 23, price: 0.00008, bonus: 0},
    ]
    for (let entity of priceTable){
      await pricesCheck(entity.week, entity.price, entity.bonus);
    }
  });

  it("Real time", async () => {
    let instance = await AlphaMarketICO.new([
      roles.cheifOwner, 
      roles.secondLineOwners[0], 
      roles.secondLineOwners[1]
    ]);

    await instance.updateState({from: roles.investors[6]});
  });
});
