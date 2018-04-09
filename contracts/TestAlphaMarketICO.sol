pragma solidity ^0.4.19;

import './AlphaMarketICO.sol';

contract TestAlphaMarketICO is AlphaMarketICO {
    function TestAlphaMarketICO(address[] _owners) AlphaMarketICO(_owners) public {}

    function currentTime() internal view returns (uint) {
        return testTime;
    }

    function setCurrentTime(uint _newTime) external onlyowner {
        testTime = _newTime;
    }

    function setHardCap(uint _hardCap) external onlyowner {
        hardCap = _hardCap;
    }

    function setTotalSold(uint _totalSold) external onlyowner {
        totalSold = _totalSold;
    }

    uint public testTime = 0;
}