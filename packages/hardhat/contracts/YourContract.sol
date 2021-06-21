
//SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;


import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";




contract YourContract is VRFConsumerBase {
    
    
    struct dis {
        uint randomNumber;
        bool available;
        
    }
    bytes32 internal keyHash;
    uint256 internal fee;
    uint public round=0;
    address public owner;
    uint public totalBalance;
    bool public available;
    event RoundNumber (uint round);
    event RoundDetails(uint,uint);
    event winner(uint);

    mapping(uint => dis) public getRandomByRound;
    
    constructor() VRFConsumerBase(
           0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B, // VRF Coordinator
            0x01BE23585060835E02B77ef475b0Cc51aA1e0709   // LINK Token
        ) public
    {
        keyHash = 0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311;
        fee = 0.1 * 10 ** 18; // 0.1 LINK
   
        owner = msg.sender;
        round = 1;
        
    }
    
    struct dat {
     
        uint ticketBalance;
        mapping(address => bool) isIn;
        mapping(address => uint) amountInvested;
        
    }
    mapping(uint => mapping(uint => dat)) public getDetails;
    
    struct data {
        uint roundBalance;
        uint roundPlayers;
    }
    
    mapping(uint => data) public getRoundDetails;

    function roundDetails() public view returns(uint,uint){
        return (getRoundDetails[round].roundBalance,getRoundDetails[round].roundPlayers);
    }
    

    
   function buyTicket(uint _pickedNumber) payable public{
       require(msg.value >= 1, "Not enough money");
        
       if( getRoundDetails[round].roundPlayers ==  10) {
           round++;
           emit RoundNumber(round);

       }
       
       if( getRoundDetails[round].roundPlayers ==  9) {
           getRandomByRound[round].available = false;
           getRandomNumber(uint(msg.sender));
       }

       getRoundDetails[round].roundPlayers++;
       
       getDetails[round][_pickedNumber].isIn[msg.sender] =  true;
       getDetails[round][_pickedNumber].amountInvested[msg.sender] += msg.value;
       getDetails[round][_pickedNumber].ticketBalance = getDetails[round][_pickedNumber].ticketBalance + msg.value;
       getRoundDetails[round].roundBalance = getRoundDetails[round].roundBalance + msg.value;
       totalBalance = totalBalance + msg.value;
       emit RoundDetails(getRoundDetails[round].roundPlayers, getRoundDetails[round].roundBalance);

       
   }
   
  
   
   function claimPrize(uint _round) public{
       
       uint randomNumber = getRandomByRound[_round].randomNumber;
       require(getRandomByRound[_round].available , "Lottery not completed yet");
       require(getRoundDetails[_round].roundPlayers == 10 , "Lottery not completed yet");
       require (getDetails[_round][randomNumber].isIn[msg.sender],"sorry you lost the bet!" );
       
       
       uint amount = (   ( (getRoundDetails[_round].roundBalance * getDetails[_round][randomNumber].amountInvested[msg.sender] ) / getDetails[_round][randomNumber].ticketBalance) );
       payable(msg.sender).transfer(amount);
       totalBalance = totalBalance - amount;
       getDetails[_round][randomNumber].amountInvested[msg.sender] = 0;
       
       
   }
   

   
  
  
    function getRandomNumber(uint256 userProvidedSeed) public returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        
        return requestRandomness(keyHash, fee, userProvidedSeed);
    }

    
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        getRandomByRound[round].randomNumber = randomness.mod(10).add(1);
        emit winner(getRandomByRound[round].randomNumber);
        getRandomByRound[round].available = true;
        
        
    }
    

   
}

