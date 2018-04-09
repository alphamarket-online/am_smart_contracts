const AlphaMarketCoinExchanger = artifacts.require("./AlphaMarketCoinExchanger.sol");
const AlphaMarketCoin = artifacts.require("./AlphaMarketCoin.sol");

contract('AlphaMarketCoinExchanger', async (accounts) => {
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

  async function performOperationByOwners(op) {
    console.log("Start operation from cheif");
    await op({from: roles.cheifOwner});
    console.log("Start operation from second owner");
    await op({from: roles.secondLineOwners[0]});
  }

  async function getNewInstance() {
    let token = await AlphaMarketCoin.new(roles.cheifOwner, {from: roles.cheifOwner});
    let exchanger = await AlphaMarketCoinExchanger.new([
      roles.cheifOwner, 
      roles.secondLineOwners[0], 
      roles.secondLineOwners[1]
    ], token.address, {from: roles.cheifOwner});
    await token.transfer(exchanger.address, await token.totalSupply(), {from: roles.cheifOwner});
    await token.enableTransfering({from: roles.cheifOwner});
    return [exchanger, token];
  }

  it("New test instance correctness", async () => {
    const [exchanger, token] = await getNewInstance();

    await exchanger.buyTokens({from: roles.investors[2], value: web3.toWei(10, 'finney')});
    assert((await token.balanceOf(roles.investors[2])).eq(web3.toWei(100000, 'finney')));

    await web3.eth.sendTransaction({
      from: roles.investors[3], 
      to: exchanger.address, 
      value: web3.toWei(10, 'finney'),
      gas: 5000000
      // gas: 60000
    });

    assert((await token.balanceOf(roles.investors[3])).eq(web3.toWei(100000, 'finney')));
  });

  it("Transfer eth", async () => {
    const [exchanger, token] = await getNewInstance();

    await exchanger.buyTokens({from: roles.investors[2], value: web3.toWei(10, 'finney')});
    assert((await token.balanceOf(roles.investors[2])).eq(web3.toWei(100000, 'finney')));

    assert((await web3.eth.getBalance(exchanger.address)).eq(web3.toWei(10, 'finney')));
    
    assertThrowsAsynchronously(async function() {
      await exchanger.transferEther(roles.investors[0], web3.toWei(10, 'finney'), {from: roles.investors[0]});
    }, Error, "VM Exception while processing transaction: revert");
    assert((await web3.eth.getBalance(exchanger.address)).eq(web3.toWei(10, 'finney')));

    await performOperationByOwners(exchanger.transferEther.bind(null, "0x0", web3.toWei(10, 'finney')));
    assert((await web3.eth.getBalance(exchanger.address)).eq(web3.toWei(10, 'finney')));

    var balanceOfUser = await web3.eth.getBalance(roles.investors[3]);
    await performOperationByOwners(exchanger.transferEther.bind(null, roles.investors[3], web3.toWei(10, 'finney')));
    assert((await web3.eth.getBalance(exchanger.address)).eq(web3.toWei(0, 'finney')));
    assert((await web3.eth.getBalance(roles.investors[3])).eq(balanceOfUser.plus(web3.toWei(10, 'finney'))));
  });

  it("Transfer tokens", async () => {
    const [exchanger, token] = await getNewInstance();

    assertThrowsAsynchronously(async function() {
      await exchanger.transferTokens(roles.investors[0], web3.toWei(10, 'finney'), {from: roles.investors[0]});
    }, Error, "VM Exception while processing transaction: revert");
    assert((await token.balanceOf(roles.investors[0])).eq(web3.toWei(0, 'finney')));   

    var balanceOfExchanger = await token.balanceOf(exchanger.address);
    await performOperationByOwners(exchanger.transferTokens.bind(null, "0x0", web3.toWei(10, 'finney')));
    assert((await token.balanceOf(exchanger.address)).eq(balanceOfExchanger));
    
    await performOperationByOwners(exchanger.transferTokens.bind(null, roles.investors[0], web3.toWei(10, 'finney')));
    assert((await token.balanceOf(roles.investors[0])).eq(web3.toWei(10, 'finney')));    
  });

  it("Set price", async () => {
    const [exchanger, token] = await getNewInstance();

    await exchanger.buyTokens({from: roles.investors[2], value: web3.toWei(10, 'finney')});
    assert((await token.balanceOf(roles.investors[2])).eq(web3.toWei(100000, 'finney')));

    assertThrowsAsynchronously(async function() {
      await exchanger.setTokensPerEther(999999, 1, {from: roles.investors[0]});
    }, Error, "VM Exception while processing transaction: revert");

    await performOperationByOwners(exchanger.setTokensPerEther.bind(null, 2, 0));
    assert.equal(await exchanger.tokensPerEther_numerator(), 10000);
    assert.equal(await exchanger.tokensPerEther_denominator(), 1);

    await performOperationByOwners(exchanger.setTokensPerEther.bind(null, 2, 10));

    await exchanger.buyTokens({from: roles.investors[5], value: web3.toWei(10, 'finney')});
    assert((await token.balanceOf(roles.investors[5])).eq(web3.toWei(2, 'finney')));
  });
});