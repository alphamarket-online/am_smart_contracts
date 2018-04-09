pragma solidity ^0.4.19;

import './AlphaMarketCoin.sol';
import './Multiowned.sol';

contract AlphaMarketTeamBountyWallet is Multiowned {
    function AlphaMarketTeamBountyWallet(address[] _owners, address _tokenAddress) Multiowned(_owners, _owners.length - 1) public {
        token = AlphaMarketCoin(_tokenAddress);
    }

    function transferTokens(address _to, uint256 _value) external onlymanyowners(sha3(msg.data)) {
        if(_value == 0 || token.balanceOf(this) < _value || _to == 0x0) {
            return;
        }
        token.transfer(_to, _value);
    }

    // Prevent sending ether to this address
    function () external payable {
        revert();
    }

    AlphaMarketCoin public token;
}