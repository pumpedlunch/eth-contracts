//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/** 
creates a billboard where anyone can pay a minimum cost to set a message. Anyone can overwrite the previous message by buying out
the previous setter and matching the previous setter's cost. The buyout is calculated as the previous setter's cost minus the contract's fee 
times the percentage of the time decay period remaining for the message.
 **/
contract Billboard {
    //constants set by constructor
    uint256 public minCost;
    uint256 public fee; // in percent
    uint256 public buyoutDecayPeriod; // in seconds
    address payable public manager;
    //struct that holds billboard state
    struct BillboardInfo {
        string message;
        address payable owner;
        uint256 startTime; // seconds since epoch
        uint256 cost;
    }
    BillboardInfo private billboardInfo;

    //event for billboard change
    event billboardChanged();

    constructor(
        uint256 _buyoutDecayPeriod,
        uint256 _minCost,
        uint256 _fee,
        string memory _startMessage
    ) {
        //set constants
        buyoutDecayPeriod = _buyoutDecayPeriod;
        minCost = _minCost;
        fee = _fee;
        manager = payable(msg.sender);
        //initialize variables
        billboardInfo.message = _startMessage;
    }

    function setMessage(string memory _message) public payable {
        uint256 buyout = getBuyout();
        //if buyout > 0, pay buyout and match previous message cost
        if (buyout > 0) {
            require(
                msg.value > buyout + billboardInfo.cost,
                "insufficient value"
            );
            billboardInfo.owner.transfer(buyout);
        }
        // else require value is greater than minimum cost
        else require(msg.value > minCost, "insufficient message value");
        //update variables
        billboardInfo.message = _message;
        billboardInfo.owner = payable(msg.sender);
        billboardInfo.startTime = block.timestamp;
        billboardInfo.cost = msg.value - buyout;
        //emit event
        emit billboardChanged();
    }

    function managerWithdrawFunds(uint256 _amount) public {
        //restrict to manager only
        require(msg.sender == manager, "only manager can withdraw funds");
        //calculate balance available for withdrawal
        uint256 buyout = getBuyout();
        uint256 availableBal = address(this).balance - buyout;
        require(
            _amount < availableBal,
            "the value requested is more than the available balance"
        );
        //send amount
        manager.transfer(_amount);
    }

    function getBillboardState()
        public
        view
        returns (
            string memory,
            address,
            uint256,
            uint256,
            uint256
        )
    {
        uint256 messageTimeRemaining = getMessageTimeRemaining();
        uint256 buyout = getBuyout();
        return (
            billboardInfo.message,
            billboardInfo.owner,
            billboardInfo.cost,
            messageTimeRemaining,
            buyout
        );
    }

    function getMessageTimeRemaining() internal view returns (uint256) {
        //calc how much time is remaining on existing message
        uint256 messageAge = block.timestamp - billboardInfo.startTime;
        uint256 messageTimeRemaining = 0;
        if (messageAge < buyoutDecayPeriod) {
            messageTimeRemaining = buyoutDecayPeriod - messageAge;
        }
        return messageTimeRemaining;
    }

    function getBuyout() internal view returns (uint256) {
        uint256 messageTimeRemaining = getMessageTimeRemaining();
        //calc buyout based on time remaining and refundable portion
        uint256 buyout = (((billboardInfo.cost * messageTimeRemaining) /
            buyoutDecayPeriod) * (100 - fee)) / 100;

        return buyout;
    }
}
