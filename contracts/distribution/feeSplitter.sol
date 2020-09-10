pragma solidity ^0.6.2;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

//import "../utils/IERC223Recipient.sol";

// interface stakingInterface {
//     // function _mint(address account, uint256 amount, uint256 fee, address feeAddr) external;
//     // function _burn(address account, uint256 toBurn, uint256 fee, address feeAddr) external;
//     // function checkLoan(address user) external view returns (uint256 owed);
//     // function balanceOf(address account) external view returns (uint256); 
// }

interface uDaiInterface {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address _to, uint _value) external returns (bool success);
}

contract feeSplitter /* is IERC223Recipient */ {
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
    
    // uDai Address
    address _uDaiAddr;
    //Approved Contracts
    // mapping (uint32 => address) listOfLLC;



    //Unbound Token Contracts
    uDaiInterface private uDaiContract;
    // stakingInterface private stakingContract;

    // Modifiers
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    // Constructor
    constructor (address eFundAddr, address devFundAddr, address uDai) public {
        // stakingContract = stakingInterface(stakeAddr);
        uDaiContract = uDaiInterface(uDai);

        // Sets corresponding addresses
        _owner = msg.sender;
        // _stakeAddr = devFundAddr;
        _eFundAddr = eFundAddr;
        _devFundAddr = devFundAddr;
        _uDaiAddr = uDai;
        
    }

    // onlyOwner Functions

    // This must be called
    function splitFunds() public {
        uint256 funds = uDaiContract.balanceOf(address(this));
        require(funds > 0, "Nothing to split");

        // to achieve 40/40/20, we will cut funds into fifths.
        // This is hardcoded and cannot be altered. Would require rework to be able to change % distribution.
        uint256 fifth = funds.div(5);

        // sends 40%
        uDaiContract.transfer(_stakeAddr, fifth.add(fifth));
        uDaiContract.transfer(_eFundAddr, fifth.add(fifth));

        // sends 20%
        // This math is to ensure we do not accidentally create or destroy tokens out of thin air.
        uDaiContract.transfer(_devFundAddr, funds.sub(fifth.mul(4)));

    }


    // Checks if sender is owner
    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    // Changes owner
    function setOwner(address _newOwner) public onlyOwner {
        _owner = _newOwner;
    }

    // change stake Address
    function changeStake(address _newAddr) public onlyOwner {
        _stakeAddr = _newAddr;
    }

    // change devFund Address
    function changeDev(address _newAddr) public onlyOwner {
        _devFundAddr = _newAddr;
    }

    // change emergency Fund Address
    function changeE(address _newAddr) public onlyOwner {
        _eFundAddr = _newAddr;
    }

    // change uDai? Probably should not...
}