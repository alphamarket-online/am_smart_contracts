pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';


/// @title Alpha Market Coin contract
contract AlphaMarketCoin is StandardToken {

    function AlphaMarketCoin(address _controller) public {
        controller = _controller;
        earlyAccess[_controller] = true;
        totalSupply_ = 999999999 * 10 ** uint256(decimals);
        balances[_controller] = totalSupply_;
    }

    modifier onlyController {
        require(msg.sender == controller);
        _;
    }

    // Transfering should be enabled by ICO contract only when half of ICO is passed
    event TransferEnabled();

    function addEarlyAccessAddress(address _address) external onlyController {
        require(_address != 0x0);
        earlyAccess[_address] = true;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(isTransferEnabled || earlyAccess[msg.sender]);
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(isTransferEnabled);
        return super.transferFrom(_from, _to, _value);
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        require(isTransferEnabled);
        return super.approve(_spender, _value);
    }
    
    function enableTransfering() public onlyController {
        require(!isTransferEnabled);

        isTransferEnabled = true;
        emit TransferEnabled();
    }

    // Prevent sending ether to this address
    function () public payable {
        revert();
    }

    bool public isTransferEnabled = false;
    address public controller;
    mapping(address => bool) public earlyAccess;

    uint8 public constant decimals = 18;
    string public constant name = 'AlphaMarket Coin';
    string public constant symbol = 'AMC';
}
