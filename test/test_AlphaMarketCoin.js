const AlphaMarketCoin = artifacts.require("./AlphaMarketCoin.sol");

contract('AlphaMarketCoin', async (accounts) => {
  const roles = {
    deployer: accounts[0],
    controller: accounts[1],
    users: [
      accounts[2],
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

  it("New test instance correctness", async () => {
    let instance = await AlphaMarketCoin.new(roles.controller, {from: roles.deployer});

    assert((await instance.totalSupply()).eq(new web3.BigNumber(web3.toWei(999999999, 'ether'))));
    assert.equal(await instance.controller(), roles.controller);
    
    assert.equal(await instance.earlyAccess(roles.controller), true);
    assert.equal(await instance.earlyAccess(roles.deployer), false);
    
    assertThrowsAsynchronously(async function() {
      await web3.eth.sendTransaction({
        from: roles.users[3], 
        to: instance.address, 
        value: web3.toWei(10, 'finney'),
        gas: 60000
      });
    }, Error, "VM Exception while processing transaction: revert");
  });

  it("Early access", async () => {
    let instance = await AlphaMarketCoin.new(roles.controller, {from: roles.deployer});

    assert.equal(await instance.earlyAccess(roles.controller), true);
    assert.equal(await instance.earlyAccess(roles.users[0]), false);

    await instance.transfer(roles.users[0], web3.toWei(100, 'finney'), {from: roles.controller});

    assertThrowsAsynchronously(async function() {
        await instance.transfer(roles.users[1], web3.toWei(100, 'finney'), {from: roles.users[0]});
    }, Error, "VM Exception while processing transaction: revert");

    assertThrowsAsynchronously(async function() {
      await instance.addEarlyAccessAddress(roles.users[0], {from: roles.users[0]});
    }, Error, "VM Exception while processing transaction: revert");

    await instance.addEarlyAccessAddress(roles.users[0], {from: roles.controller});
    await instance.transfer(roles.users[1], web3.toWei(100, 'finney'), {from: roles.users[0]});

    assert((await instance.balanceOf(roles.users[1])).eq(web3.toWei(100, 'finney')));
  });
  
  it("Enable transfering", async () => {
    let instance = await AlphaMarketCoin.new(roles.controller, {from: roles.deployer});

    assert.equal(await instance.earlyAccess(roles.controller), true);
    assert.equal(await instance.earlyAccess(roles.users[0]), false);

    await instance.transfer(roles.users[0], web3.toWei(100, 'finney'), {from: roles.controller});

    assertThrowsAsynchronously(async function() {
        await instance.transfer(roles.users[1], web3.toWei(100, 'finney'), {from: roles.users[0]});
    }, Error, "VM Exception while processing transaction: revert");

    assertThrowsAsynchronously(async function() {
        await instance.approve(roles.users[1], web3.toWei(100, 'finney'), {from: roles.users[0]});
    }, Error, "VM Exception while processing transaction: revert");

    assertThrowsAsynchronously(async function() {
        await instance.transferFrom(roles.users[0], roles.users[2], web3.toWei(100, 'finney'), {from: roles.users[1]});
    }, Error, "VM Exception while processing transaction: revert");

    assertThrowsAsynchronously(async function() {
      await instance.enableTransfering({from: roles.users[0]});
    }, Error, "VM Exception while processing transaction: revert");

    await instance.enableTransfering({from: roles.controller});
    await instance.transfer(roles.users[1], web3.toWei(50, 'finney'), {from: roles.users[0]});

    assert((await instance.balanceOf(roles.users[1])).eq(web3.toWei(50, 'finney')));

    await instance.approve(roles.users[1], web3.toWei(50, 'finney'), {from: roles.users[0]});
    await instance.transferFrom(roles.users[0], roles.users[2], web3.toWei(50, 'finney'), {from: roles.users[1]});
    assert((await instance.balanceOf(roles.users[2])).eq(web3.toWei(50, 'finney')));
  });
});