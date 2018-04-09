pragma solidity ^0.4.19;

import './AlphaMarketCoin.sol';
import './Multiowned.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ReentrancyGuard.sol';

contract AlphaMarketICO is Multiowned, ReentrancyGuard {
    using SafeMath for uint256;
    enum State { DEFINED, IN_PROGRESS_TOKEN_FREEZE, IN_PROGRESS, FAILED, SUCCEEDED }

    event EtherTransfered(address indexed to, uint value);
    event StateUpdated(State state);
    event InvestmentProcessed(address from, uint value);

    function AlphaMarketICO(address[] _owners) Multiowned(_owners, _owners.length - 1) public {}

    function setToken(address _token) external onlyowner {
        require(address(token) == 0x0);
        require(address(_token) != 0x0);
        token = AlphaMarketCoin(_token);
        tokensToSold = token.totalSupply().mul(60).div(100);
    }

    function setExchanger(address _exchanger) external onlyowner {
        require(_exchanger != 0x0 && exchanger == 0x0);
        exchanger = _exchanger;
    }

    function sendTokensToBountyWallet(address _bountyWallet) external onlyowner {
        require(!isBountySent && _bountyWallet != 0x0);

        token.addEarlyAccessAddress(_bountyWallet);
        uint256 tokensForBounty = token.totalSupply().mul(20).div(100);
        token.transfer(_bountyWallet, tokensForBounty);
        isBountySent = true;
    }
    

    modifier processState {
        updateState();
        _;
    }

    modifier icoInProgress {
        require((icoState == State.IN_PROGRESS || icoState == State.IN_PROGRESS_TOKEN_FREEZE) && currentTime() < endTime);
        _;
    }

    function updateState() public {
        uint currTime = currentTime();
        
        if (icoState == State.IN_PROGRESS_TOKEN_FREEZE || icoState == State.IN_PROGRESS) {
            if (icoState == State.IN_PROGRESS_TOKEN_FREEZE) {
                if (currTime >= tokenUnfreezeTime) {
                    token.enableTransfering();
                    icoState = State.IN_PROGRESS;
                    emit StateUpdated(icoState);
                }
            }
            if (currTime >= endTime || totalInvestment >= hardCap || totalSold >= tokensToSold) {
                token.transfer(exchanger, token.balanceOf(this));
                icoState = State.SUCCEEDED;
                emit StateUpdated(icoState);
            }
        } else if (icoState == State.DEFINED) {
            if (currTime >= startTime) {
                icoState = State.IN_PROGRESS_TOKEN_FREEZE;
                emit StateUpdated(icoState);
            }
        }
    }

    function rewardContributors(address[] _contributors, uint256[] _tokenAmounts) external onlymanyowners(sha3(msg.data)) {
        if(isContributorsRewarded || _contributors.length != _tokenAmounts.length) {
            return;
        }

        uint256 sum = 0;
        for (uint64 i = 0; i < _contributors.length; i++) {
            require(_contributors[i] != 0x0);
            sum = sum.add(_tokenAmounts[i]);
            token.transfer(_contributors[i], _tokenAmounts[i]);
        }
        require(sum == token.totalSupply().mul(20).div(100));
        isContributorsRewarded = true;
    }

    function getTokensCountPerEther() internal view returns (uint256) {
        uint currTime = currentTime();
        require(currTime >= startTime);

        if (currTime < startTime + 1 weeks) {return  27778;}
        if (currTime < startTime + 2 weeks) {return  25000;}
        if (currTime < startTime + 3 weeks) {return  22727;}
        if (currTime < startTime + 4 weeks) {return  20833;}
        if (currTime < startTime + 5 weeks) {return  19230;}
        if (currTime < startTime + 6 weeks) {return  17857;}
        if (currTime < startTime + 7 weeks) {return  16667;}
        if (currTime < startTime + 8 weeks) {return  15625;}
        if (currTime < startTime + 9 weeks) {return  14706;}
        if (currTime < startTime + 10 weeks) {return 13889;}
        if (currTime < startTime + 11 weeks) {return 13158;}
        if (currTime < startTime + 12 weeks) {return 12500;}
        if (currTime < endTime) {return              12500;}
    }

    function getBonus() internal view returns (uint) {
        uint currTime = currentTime();
        require(currTime >= startTime);

        if (currTime < startTime + 1 weeks) {return  20;}
        if (currTime < startTime + 2 weeks) {return  18;}
        if (currTime < startTime + 3 weeks) {return  16;}
        if (currTime < startTime + 4 weeks) {return  14;}
        if (currTime < startTime + 5 weeks) {return  12;}
        if (currTime < startTime + 6 weeks) {return  10;}
        if (currTime < startTime + 7 weeks) {return  8;}
        if (currTime < startTime + 8 weeks) {return  6;}
        if (currTime < startTime + 9 weeks) {return  4;}
        if (currTime < startTime + 10 weeks) {return 3;}
        if (currTime < startTime + 11 weeks) {return 2;}
        if (currTime < startTime + 12 weeks) {return 1;}
        if (currTime < endTime) {return              0;}
    }

    function processInvestment(address investor, uint256 value, address referrer) internal processState icoInProgress {
        require(value >= minInvestment && value <= maxInvestment);
        uint256 tokensCount = uint256(value).mul(getTokensCountPerEther());

        // Add bonus tokens
        uint256 tokensSold = tokensCount.add(tokensCount.mul(getBonus()).div(100));
        token.transfer(investor, tokensSold);

        if (referrer != 0x0) {
            require(referrer != investor);
            uint256 tokensForReferrer = tokensCount.mul(5).div(100);
            token.transfer(referrer, tokensForReferrer);
            tokensSold = tokensSold.add(tokensForReferrer);
        }

        investments[investor] = investments[investor].add(value);
        totalInvestment = totalInvestment.add(value);
        totalSold = totalSold.add(tokensSold);
        emit InvestmentProcessed(investor, value);
    }

    function buyTokensWithRef(address referrer) public payable {
        processInvestment(msg.sender, msg.value, referrer);
    }

    function buyTokens() public payable {
        processInvestment(msg.sender, msg.value, 0x0);
    }
    
    function() external payable {
        require(0 == msg.data.length);
        buyTokens();
    }

    function transferEther(address to, uint value) external nonReentrant onlymanyowners(sha3(msg.data)) {
        if(value == 0 || this.balance < value || to == 0x0){
            return;
        }
        to.transfer(value);
        EtherTransfered(to, value);
    }

    function failICO() external onlymanyowners(sha3(msg.data)) {
        icoState = State.FAILED;
        emit StateUpdated(icoState);
    }

    function withdrawRefund() external nonReentrant {
        require(icoState == State.FAILED);

        uint256 investment = investments[msg.sender];
        require(investment > 0 && this.balance >= investment);

        totalInvestment = totalInvestment.sub(investment);
        investments[msg.sender] = 0;
        msg.sender.transfer(investment);
    }

    function currentTime() internal view returns (uint) {
        return now;
    }

    uint public startTime = 1523880000; // Unix epoch timestamp. Wednesday, April 16, 2018 12:00:00 PM
    uint public tokenUnfreezeTime = startTime + 12 weeks;
    uint public endTime = startTime + 24 weeks; 
    uint public hardCap = 48000 ether;
    uint public minInvestment = 10 finney;
    uint public maxInvestment = hardCap;
    uint public tokensToSold;
    State public icoState = State.DEFINED;

    mapping(address => uint256) public investments;
    uint256 public totalInvestment = 0;
    uint256 public totalSold = 0;

    bool public isContributorsRewarded = false;
    bool public isBountySent = false;
    AlphaMarketCoin public token;
    address public exchanger;
}