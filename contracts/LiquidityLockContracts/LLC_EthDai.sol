pragma solidity ^0.6.2;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";



interface valuingInterface {
    function unboundCreate(uint256 amount, address user, address token) external;
    function unboundRemove(uint256 toUnlock, uint256 totalLocked, address user, address token) external;
    
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

    // LPT address
    address public pair;

    // Oracle Variables
    uint    public price0CumulativeLast;
    uint    public price1CumulativeLast;
    uint256  public blockTimestampLast;

    uint public constant PERIOD = 60; // set to 60 seconds for easy testing.

    // tokens locked by users
    mapping (address => uint256) public _tokensLocked;

    // token position of Stablecoin
    uint8 _position;

    // Interfaced Contracts
    valuingInterface private valuingContract;
    liquidityPoolToken private LPTContract;

    // Modifiers
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    // Constructor
    constructor (address valuingAddress, address LPTaddress, uint8 position) public {
        _owner = msg.sender;
        
        valuingContract = valuingInterface(valuingAddress);
        LPTContract = liquidityPoolToken(LPTaddress);
        pair = LPTaddress;

        // Set Position of Stablecoin
        require(position == 0 || position == 1, "invalid");
        _position = position;

        // ORACLE

        // (uint price0Cumulative, uint price1Cumulative, uint32 blockTimestamp) =
        //     UniswapV2OracleLibrary.currentCumulativePrices(address(pair));

        // price0CumulativeLast = price0Cumulative;
        // price1CumulativeLast = price1Cumulative;
        // blockTimestampLast = blockTimestamp;

        price0CumulativeLast = LPTContract.price0CumulativeLast(); // fetch the current accumulated price value (1 / 0)
        price1CumulativeLast = LPTContract.price1CumulativeLast(); // fetch the current accumulated price value (0 / 1)
        uint112 reserve0;
        uint112 reserve1;
        (reserve0, reserve1, blockTimestampLast) = LPTContract.getReserves();

        // require(reserve0 != 0 && reserve1 != 0, 'NO_RESERVES'); // ensure that there's liquidity in the pair
    }

    // Lock/Unlock functions
    // Mint path
    // tokenNum must be 0 (for now)
    function lockLPT (uint256 LPTamt, address uTokenAddr, uint8 v, bytes32 r, bytes32 s) public {
        require(LPTContract.balanceOf(msg.sender) >= LPTamt, "insufficient Liquidity");
        uint256 totalLPTokens = LPTContract.totalSupply();
        
        uint256 totalUSD = pricing();
        
        // This should compute % value of Liq pool in Dai. Cannot have decimals in Solidity
        uint256 LPTValueInDai = totalUSD.mul(LPTamt).div(totalLPTokens);  

        // call Permit and Transfer
        uint deadline = block.timestamp.add(600); // Hardcoding 10 minutes.
        // question for chetan


        transferLPT(msg.sender, LPTamt, deadline, v, r, s);
        

        // map locked tokens to user address
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].add(LPTamt);

        // Call Valuing Contract
        valuingContract.unboundCreate(LPTValueInDai, msg.sender, uTokenAddr); // Hardcode "0" for AAA rating
        
    }

    function lockLPT1 (uint256 LPTamt, address uTokenAddr) public {
        require(LPTContract.balanceOf(msg.sender) >= LPTamt, "insufficient Liquidity");
        uint256 totalLPTokens = LPTContract.totalSupply();


        uint256 totalUSD = pricing();

        // This should compute % value of Liq pool in Dai. Cannot have decimals in Solidity
        uint256 LPTValueInDai = totalUSD.mul(LPTamt).div(totalLPTokens);  

        transferLPT1(LPTamt);
        
        // map locked tokens to user
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].add(LPTamt);

        // Call Valuing Contract
        valuingContract.unboundCreate(LPTValueInDai, msg.sender, uTokenAddr); // Hardcode "0" for AAA rating
        
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
    function unlockLPT (uint256 LPToken, address uTokenAddr) public {
        require (_tokensLocked[msg.sender] >= LPToken, "Insufficient liquidity locked");

        // Burning of Udai will happen first
        valuingContract.unboundRemove(LPToken, _tokensLocked[msg.sender], msg.sender, uTokenAddr);
        
        LPTContract.transfer(msg.sender, LPToken);
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].sub(LPToken);
        
    }

    function pricing() internal returns (uint256 totalDai) {
        uint256 price0cumulative = LPTContract.price0CumulativeLast();
        uint256 price1cumulative = LPTContract.price1CumulativeLast();

        // Gets reserve values
        (uint112 _token0, uint112 _token1, uint32 _time) = LPTContract.getReserves();

        // reverts if priceCumul - priceCumulLast = 0
        require( _time - blockTimestampLast > 0, "need more time");
        
        // use oracle pricing to calculate value in Stablecoin
        // TEST!!!!!
        if (_position == 0) {
            // totalDai = _token0 + _token1.mul((price1CumulativeLast.sub(price1cumulative)).div(_time - blockTimestampLast)); 
            totalDai = _token0 + _token1 * (price1CumulativeLast - price1cumulative) / (_time - blockTimestampLast);
        } else {
            // totalDai = _token1 + _token0.mul((price0CumulativeLast.sub(price0cumulative)).div(_time - blockTimestampLast));
            totalDai = _token1 + _token0 * (price0CumulativeLast - price0cumulative) / (_time - blockTimestampLast);
        }

        // checks if enough time has passed to update price cumulative last
        if (_time - blockTimestampLast >= PERIOD) {
            price0CumulativeLast = price0cumulative;
            price1CumulativeLast = price1cumulative;
            blockTimestampLast = _time;
        }

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