pragma solidity ^0.6.2;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface valuingInterface {
    function unboundCreate(uint256 amount, address user, uint8 token, uint32 LLC, uint32 rating) external;
    function unboundRemove(uint256 toUnlock, uint256 totalLocked, address user, uint8 token, uint32 LLC) external;
    
}

interface liquidityPoolToken {
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint);

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;

    function factory() external view returns (address); // needed?
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external view returns (uint);
    function price1CumulativeLast() external view returns (uint);
    function kLast() external view returns (uint);
}

// Liquidity Lock Contract for ETH/DAI pair
contract LLC_EthDai {
    using SafeMath for uint256;
    using Address for address;

    //Owner Address
    address _owner;

    // Position in Valuing - eth/dai is zero
    uint32 position = 1;

    // tokens locked by users
    mapping (address => uint256) _tokensLocked;

    // Interfaced Contracts
    valuingInterface private valuingContract;
    liquidityPoolToken private LPTContract;

    // Modifiers
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    // Constructor
    constructor (address valuingAddress, address LPTaddress) public {
        _owner = msg.sender;
        
        valuingContract = valuingInterface(valuingAddress);
        LPTContract = liquidityPoolToken(LPTaddress);
    }

    // Lock/Unlock functions
    // Mint path
    // tokenNum must be 0 (for now)
    function lockLPT (uint256 LPTamt, uint8 tokenNum, uint extraTime, uint8 v, bytes32 r, bytes32 s) public {
        require(LPTContract.balanceOf(msg.sender) >= LPTamt, "insufficient Liquidity");
        uint256 totalLPTokens = LPTContract.totalSupply();

        // token0 is DAI, token1 is WETH
        // COULD REMOVE _token1 and _time. They are not used. But we need to test this first.
        (uint112 _token0, uint112 _token1, uint32 _time) = LPTContract.getReserves();
        
        uint256 totalDai = _token0 * 2; // This is assuming the value of WETH is equal to value in DAI

        // Use Uniswap oracle to compute average of valuations

        // This should compute % value of Liq pool in Dai. Cannot have decimals in Solidity
        uint256 LPTValueInDai = totalDai.mul(LPTamt).div(totalLPTokens);  

        // call Permit and Transfer
        uint deadline = block.timestamp.add(extraTime);

        transferLPT(msg.sender, LPTamt, deadline, v, r, s);
        

        // map locked tokens to user
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].add(LPTamt);

        // Call Valuing Contract
        valuingContract.unboundCreate(LPTValueInDai, msg.sender, tokenNum, position, 0); // Hardcode "0" for AAA rating
        
    }

    function lockLPT1 (uint256 LPTamt, uint8 tokenNum) public {
        require(LPTContract.balanceOf(msg.sender) >= LPTamt, "insufficient Liquidity");
        uint256 totalLPTokens = LPTContract.totalSupply();

        // token0 is DAI, token1 is WETH
        // COULD REMOVE _token1 and _time. They are not used. But we need to test this first.
        (uint112 _token0, uint112 _token1, uint32 _time) = LPTContract.getReserves();
        
        uint256 totalDai = _token0 * 2; // This is assuming the value of WETH is equal to value in DAI

        // Use Uniswap oracle to compute average of valuations

        // This should compute % value of Liq pool in Dai. Cannot have decimals in Solidity
        uint256 LPTValueInDai = totalDai.mul(LPTamt).div(totalLPTokens);  

        

        transferLPT1(LPTamt);
        

        // map locked tokens to user
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].add(LPTamt);

        // Call Valuing Contract
        valuingContract.unboundCreate(LPTValueInDai, msg.sender, tokenNum, position, 0); // Hardcode "0" for AAA rating
        
    }

    function transferLPT1(uint256 amount) internal {
        //LPTContract.permit(msg.sender, address(this), amount, deadline, v, r, s);
        LPTContract.transferFrom(msg.sender, address(this), amount);
        
    }

    function transferLPT(address user, uint256 amount, uint deadline, uint8 v, bytes32 r, bytes32 s) internal {
        LPTContract.permit(user, address(this), amount, deadline, v, r, s);
        LPTContract.transferFrom(msg.sender, address(this), amount);
        
    }

    // Burn Path

    // tokenNum must be 0
    function unlockLPT (uint256 LPToken, uint8 tokenNum) public {
        require (_tokensLocked[msg.sender] >= LPToken, "Insufficient liquidity locked");

        // Burning of Udai will happen first
        valuingContract.unboundRemove(LPToken, _tokensLocked[msg.sender], msg.sender, tokenNum, position);
        
        LPTContract.transfer(msg.sender, LPToken);
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].sub(LPToken);
        // compute amount to burn based on this
        // I think with this formula, even if all valuing variables are constant, it is possible that the amount of Udai to burn may be more/less than on Mint.

    }
    

    // onlyOwner Functions

    // Checks if sender is owner
    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    // Changes owner
    function setOwner(address _newOwner) public onlyOwner {
        _owner = _newOwner;
    }

    // Sets new Valuing Address
    function setValuingAddress (address _newValuing) public onlyOwner {
        valuingContract = valuingInterface(_newValuing);
    }
}