pragma solidity ^0.4.19;

import './AlphaMarketCoin.sol';
import './Multiowned.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract AlphaMarketCoinExchanger is Multiowned {
    using SafeMath for uint256;
    
    event EtherTransfered(address indexed to, uint value);

    function AlphaMarketCoinExchanger(address[] _owners, address _tokenAddress) Multiowned(_owners, _owners.length - 1) public {
        token = AlphaMarketCoin(_tokenAddress);
    }

    function setTokensPerEther(uint _numerator, uint _denomerator) external onlymanyowners(sha3(msg.data)) {
        if (_denomerator == 0) {
            return;
        }
        tokensPerEther_numerator = _numerator;
        tokensPerEther_denominator = _denomerator;
    }

    function buyTokens() public payable {
        uint256 tokensCount = uint256(msg.value).mul(tokensPerEther_numerator).div(tokensPerEther_denominator);
        token.transfer(msg.sender, tokensCount);
    }
    
    function() external payable {
        require(0 == msg.data.length);
        buyTokens();
    }

    function transferEther(address to, uint value) external onlymanyowners(sha3(msg.data)) {
        if(value == 0 || this.balance < value || to == 0x0){
            return;
        }
        to.transfer(value);
        emit EtherTransfered(to, value);
    }

    function transferTokens(address to, uint256 value) external onlymanyowners(sha3(msg.data)) {
        if(value == 0 || token.balanceOf(this) < value || to == 0x0) {
            return;
        }
        token.transfer(to, value);
    }

    uint public tokensPerEther_numerator = 10000;
    uint public tokensPerEther_denominator = 1;
    AlphaMarketCoin token;
}
