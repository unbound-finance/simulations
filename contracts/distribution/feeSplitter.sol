pragma solidity ^0.6.2;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";


interface stakingInterface {
    // function _mint(address account, uint256 amount, uint256 fee, address feeAddr) external;
    // function _burn(address account, uint256 toBurn, uint256 fee, address feeAddr) external;
    // function checkLoan(address user) external view returns (uint256 owed);
    // function balanceOf(address account) external view returns (uint256); 
}

contract feeSplitter {
    using SafeMath for uint256;
    using Address for address;

    //Owner Address
    address _owner;

    // staking contract address (40%)
    address _stakeAddr;

    // Emergency fund (40%)
    address _eFundAddr;

    // Dev fund (20%)
    address _devFundAddr;
    
    //Approved Contracts
    // mapping (uint32 => address) listOfLLC;



    //Unbound Token Contracts
    // uEthContract private uEthInterface;
    stakingInterface private stakingContract;

    // Modifiers
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    // Constructor
    constructor (address stakeAddr, address eFundAddr, address devFundAddr) public {
        stakingContract = stakingInterface(stakeAddr);
        _owner = msg.sender;
        _eFundAddr = eFundAddr;
        _devFundAddr = devFundAddr;
        
    }

    

    // onlyOwner Functions

    function tokenFallback() public {
        
    }


    // // grants an LLC permission
    // function addLLC (address LLC, uint32 position) public onlyOwner {
    //     listOfLLC[position] = LLC;
    // }

    // Checks if sender is owner
    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    // Changes owner
    function setOwner(address _newOwner) public onlyOwner {
        _owner = _newOwner;
    }

    // Changes Fee Address
    function setFeeHolder(address _newFeeAddr) public onlyOwner {
        feeHolder = _newFeeAddr;
    }
}