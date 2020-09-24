pragma solidity >=0.4.23 <0.8.0;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface erc20Template {
    function transfer(address to, uint value) external returns (bool);
    function balanceOf(address owner) external view returns (uint);
}

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
// ---------------------------------------------------------------------------------------
//                                Liquidity Lock Contract V1
//         
//                                     for ETH/DAI pair  
// ---------------------------------------------------------------------------------------
// This contract enables the user to take out a loan using their existing liquidity 
// pool tokens as collateral. The loan is issued in the form of the UND token which 
// carries a peg to the Dai. 
// 
// This contract can be used as a factory to enable multiple liquidity pools access 
// to mint UND. At this time, the Unbound protocol requires one of the reserve tokens 
// in the liquidity pool to be a stablecoin. 
// 
// In V1, we offer the ability to take out a loan after giving permission to the LLC
// to "transferFrom", as well as an option utilizing the permit() function from within
// the uniswap liquidity pool contract
//
// This is the main contract that the user will interact with. It is connected to Valuing, 
// and then the UND mint functions. Upon deployment of the LLC, its address must first be 
// registered with the valuing contract. This can only be completed by the owner (or 
// eventually a DAO).
// ----------------------------------------------------------------------------------------
contract LLC_EthDai {
    using SafeMath for uint256;
    using Address for address;

    //Owner Address
    address _owner;

    // LPT address
    address public pair;

    // tokens locked by users
    mapping (address => uint256) public _tokensLocked;

    // token position of Stablecoin
    uint8 public _position;

    // Interfaced Contracts
    valuingInterface private valuingContract;
    liquidityPoolToken private LPTContract;

    // Modifiers
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    // Constructor
    constructor (address valuingAddress, address LPTaddress, address stableCoin) public {
        _owner = msg.sender;
        
        valuingContract = valuingInterface(valuingAddress);
        LPTContract = liquidityPoolToken(LPTaddress);
        pair = LPTaddress;

        address toke0 = LPTContract.token0();
        address toke1 = LPTContract.token1();

        // assigns which token in the pair is a stablecoin
        require (stableCoin == toke0 || stableCoin == toke1, "invalid");
        if (stableCoin == toke0) {
            _position = 0;
        } else if (stableCoin == toke1) {
            _position = 1;
        }
    }

    // Lock/Unlock functions
    // Mint path
    function lockLPTWithPermit (uint256 LPTamt, address uTokenAddr, uint deadline, uint8 v, bytes32 r, bytes32 s) public {
        require(LPTContract.balanceOf(msg.sender) >= LPTamt, "insufficient Liquidity");
        uint256 totalLPTokens = LPTContract.totalSupply();

        (uint112 _token0, uint112 _token1, ) = LPTContract.getReserves();

        // obtain total USD value
        uint256 totalUSD;
        if (_position == 0) {
            totalUSD = _token0 * 2; // pricing();
        } else {
            totalUSD = _token1 * 2;
        }
        
        // This should compute % value of Liq pool in Dai. Cannot have decimals in Solidity
        uint256 LPTValueInDai = totalUSD.mul(LPTamt).div(totalLPTokens);  

        // call Permit and Transfer

        transferLPTPermit(msg.sender, LPTamt, deadline, v, r, s);
        
        // map locked tokens to user address
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].add(LPTamt);

        // Call Valuing Contract
        valuingContract.unboundCreate(LPTValueInDai, msg.sender, uTokenAddr); // Hardcode "0" for AAA rating
        
    }

    // Requires approval first
    function lockLPT (uint256 LPTamt, address uTokenAddr) public {
        require(LPTContract.balanceOf(msg.sender) >= LPTamt, "insufficient Liquidity");
        uint256 totalLPTokens = LPTContract.totalSupply();
        
        (uint112 _token0, uint112 _token1, ) = LPTContract.getReserves();

        // calculates value of pool in stablecoin
        uint256 totalUSD;
        if (_position == 0) {
            totalUSD = _token0 * 2; // pricing();
        } else {
            totalUSD = _token1 * 2;
        }

        // This should compute % value of Liq pool in Dai. Cannot have decimals in Solidity
        uint256 LPTValueInDai = totalUSD.mul(LPTamt).div(totalLPTokens);  

        transferLPT(LPTamt);
        
        // map locked tokens to user
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].add(LPTamt);

        // Call Valuing Contract
        valuingContract.unboundCreate(LPTValueInDai, msg.sender, uTokenAddr); // Hardcode "0" for AAA rating
        
    }

    // calls transfer only, for use with non-permit lock function
    function transferLPT(uint256 amount) internal {
        LPTContract.transferFrom(msg.sender, address(this), amount);
        
    }

    // calls permit, then transfer
    function transferLPTPermit(address user, uint256 amount, uint deadline, uint8 v, bytes32 r, bytes32 s) internal {
        LPTContract.permit(user, address(this), amount, deadline, v, r, s);
        LPTContract.transferFrom(msg.sender, address(this), amount);
        
    }

    // Burn Path

    // tokenNum must be 0
    function unlockLPT (uint256 LPToken, address uTokenAddr) public {
        require (_tokensLocked[msg.sender] >= LPToken, "Insufficient liquidity locked");

        // Burning of Udai will happen first
        valuingContract.unboundRemove(LPToken, _tokensLocked[msg.sender], msg.sender, uTokenAddr);
        
        // send LP tokens back to user
        LPTContract.transfer(msg.sender, LPToken);

        // update mapping
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].sub(LPToken);
        
    }

    // onlyOwner Functions

    // Claim - remove any airdropped tokens
    // currently sends all tokens back
    function claimTokens(address _tokenAddr, address to) public onlyOwner {
        require(_tokenAddr != pair, "Cannot move LP tokens");
        uint256 tokenBal = erc20Template(_tokenAddr).balanceOf(address(this));
        erc20Template(_tokenAddr).transfer(to, tokenBal);
    }

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