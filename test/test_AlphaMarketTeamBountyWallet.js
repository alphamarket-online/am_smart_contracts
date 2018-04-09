const AlphaMarketTeamBountyWallet = artifacts.require("./AlphaMarketTeamBountyWallet.sol");
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
    let bountyWallet = await AlphaMarketTeamBountyWallet.new([
      roles.cheifOwner, 
      roles.secondLineOwners[0], 
      roles.secondLineOwners[1]
    ], token.address, {from: roles.cheifOwner});
    await token.transfer(bountyWallet.address, await token.totalSupply(), {from: roles.cheifOwner});
    await token.addEarlyAccessAddress(bountyWallet.address, {from: roles.cheifOwner});
    return [bountyWallet, token];
  }

  it("New test instance correctness", async () => {
    const [bountyWallet, token] = await getNewInstance();

    assertThrowsAsynchronously(async function() {
      await web3.eth.sendTransaction({
        from: roles.investors[3], 
        to: bountyWallet.address, 
        value: web3.toWei(10, 'finney'),
        gas: 60000
      });
    }, Error, "VM Exception while processing transaction: revert");
});

  it("Transfer tokens", async () => {
    const [bountyWallet, token] = await getNewInstance();

    assertThrowsAsynchronously(async function() {
      await bountyWallet.transferTokens(roles.investors[0], web3.toWei(10, 'finney'), {from: roles.investors[0]});
    }, Error, "VM Exception while processing transaction: revert");
    assert((await token.balanceOf(roles.investors[0])).eq(web3.toWei(0, 'finney')));   
    
    var balanceOfBountyWallet = await token.balanceOf(bountyWallet.address);
    await performOperationByOwners(bountyWallet.transferTokens.bind(null, "0x0", web3.toWei(10, 'finney')));
    assert((await token.balanceOf(bountyWallet.address)).eq(balanceOfBountyWallet));
    
    await performOperationByOwners(bountyWallet.transferTokens.bind(null, roles.investors[0], web3.toWei(10, 'finney')));
    assert((await token.balanceOf(roles.investors[0])).eq(web3.toWei(10, 'finney')));    
  });
});