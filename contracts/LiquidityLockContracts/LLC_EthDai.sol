pragma solidity >=0.4.23 <0.8.0;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface erc20Template {
    function transfer(address to, uint value) external returns (bool);
    function balanceOf(address owner) external view returns (uint);
    function decimals() external view returns (uint8);
}

interface valuingInterface {
    function unboundCreate(uint256 amount, address user, address token) external;
    function unboundRemove(uint256 toUnlock, uint256 totalLocked, address user, address token) external;
}

interface liqPoolToken {
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
//                                for stablecoin/erc20 pairs  
// ---------------------------------------------------------------------------------------
// This contract enables the user to take out a loan using their existing liquidity 
// pool tokens (from the associated liquidity pool) as collateral. The loan is issued 
// in the form of the UND token which carries a peg to the Dai.
// 
// This contract can be used as a factory to enable multiple liquidity pools access 
// to mint UND. At this time, the Unbound protocol requires one of the reserve tokens 
// in the liquidity pool to be a stablecoin. 
// 
// In V1, we offer the ability to take out a loan after giving permission to the LLC
// to "transferFrom", as well as an option utilizing the permit() function from within
// the uniswap liquidity pool contract. At this time, Unbound.finance can only support
// liquidity pools which contain a USD stablecoin (i.e. DAI-ETH, USDC-UNI, etc),
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
    address private _owner;

    // LPT address
    address public pair;

    // tokens locked by users
    mapping (address => uint256) _tokensLocked;

    // token position of Stablecoin
    uint8 public _position;

    // set this in constructor, tracks decimals of stablecoin
    uint8 public stablecoinDecimal;

    // Interfaced Contracts
    valuingInterface private valuingContract;
    liqPoolToken private LPTContract;
    erc20Template private stableCoinErc20;

    // Modifiers
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    // Constructor - must provide valuing contract address, the associated Liquidity pool address (i.e. eth/dai uniswap pool token address),
    //               and the address of the stablecoin in the uniswap pair.
    constructor (address valuingAddress, address LPTaddress, address stableCoin) public {
        _owner = msg.sender;
        
        // initiates interfacing contracts
        valuingContract = valuingInterface(valuingAddress);
        LPTContract = liqPoolToken(LPTaddress);
        stableCoinErc20 = erc20Template(stableCoin);

        // set LPT address
        pair = LPTaddress;

        // saves pair token addresses to memory
        address toke0 = LPTContract.token0();
        address toke1 = LPTContract.token1();

        // sets the decimals value of the stablecoin
        stablecoinDecimal = stableCoinErc20.decimals();

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
        require(LPTContract.balanceOf(msg.sender) >= LPTamt, "LLC: Insufficient LPTs");
        uint256 totalLPTokens = LPTContract.totalSupply();
        
        // obtain amounts of tokens in both reserves.
        (uint112 _token0, uint112 _token1, ) = LPTContract.getReserves();

        // obtain total USD value
        uint256 totalUSD;
        if (_position == 0) {
            totalUSD = _token0 * 2; // pricing();
        } else {
            totalUSD = _token1 * 2;
        }

        // Token Decimal Normalization
        //
        // The following block ensures that all stablecoin valuations follow consistency with decimals
        // and match the 18 decimals used by UND. This block also solves a potential vulnerability,
        // where a stablecoin pair which contains beyond 18 decimals could be used to calculate significantly
        // more UND (by orders of 10). Likewise, stablecoins such as USDC or USDT with 6 decimals would also 
        // in far less UND being minted than desired.
        //
        // this should only happen if stablecoin decimals is NOT 18.
        if (stablecoinDecimal != 18) {
            
            uint8 difference;

            // first case: tokenDecimal is smaller than 18
            // for stablecoins with less than 18 decimals
            if (stablecoinDecimal < 18 && stablecoinDecimal >= 0) {

                // calculate amount of decimals under 18
                difference = 18 - stablecoinDecimal;

                // adds decimals to match 18
                totalUSD = totalUSD * (10 ** uint256(difference));
            }

            // second case: tokenDecimal is greater than 18
            // for tokens with more than 18 decimals 
            else if (stablecoinDecimal > 18) {

                // caclulate amount of decimals over 18
                difference = stablecoinDecimal - 18;

                // removes decimals to match 18
                totalUSD = totalUSD / (10 ** uint256(difference));
            }
        }
        
        // This should compute % value of Liq pool in Dai. Cannot have decimals in Solidity
        uint256 LPTValueInDai = totalUSD.mul(LPTamt).div(totalLPTokens);  
        
        // map locked tokens to user address
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].add(LPTamt);

        // call Permit and Transfer
        transferLPTPermit(msg.sender, LPTamt, deadline, v, r, s);

        // Call Valuing Contract
        valuingContract.unboundCreate(LPTValueInDai, msg.sender, uTokenAddr); // Hardcode "0" for AAA rating
        
    }

    // Requires approval first (permit excluded for simplicity)
    function lockLPT (uint256 LPTamt, address uTokenAddr) public {
        require(LPTContract.balanceOf(msg.sender) >= LPTamt, "LLC: Insufficient LPTs");
        uint256 totalLPTokens = LPTContract.totalSupply();
        
        // obtain amounts of tokens in both reserves.
        (uint112 _token0, uint112 _token1, ) = LPTContract.getReserves();

        // calculates value of pool in stablecoin
        uint256 totalUSD;

        // checks which of the reserve tokens is stablecoin
        // assumes stablecoin amount is equal to erc20 value
        if (_position == 0) {
            totalUSD = _token0 * 2; 
        } else {
            totalUSD = _token1 * 2;
        }

        // Token Decimal Normalization
        //
        // The following block ensures that all stablecoin valuations follow consistency with decimals
        // and match the 18 decimals used by UND. This block also solves a potential vulnerability,
        // where a stablecoin pair which contains beyond 18 decimals could be used to calculate significantly
        // more UND (by orders of 10). Likewise, stablecoins such as USDC or USDT with 6 decimals would also 
        // in far less UND being minted than desired.
        //
        // this should only happen if stablecoin decimals is NOT 18.
        if (stablecoinDecimal != 18) {
            
            uint8 difference;

            // first case: tokenDecimal is smaller than 18
            // for stablecoins with less than 18 decimals
            if (stablecoinDecimal < 18 && stablecoinDecimal >= 0) {

                // calculate amount of decimals under 18
                difference = 18 - stablecoinDecimal;

                // adds decimals to match 18
                totalUSD = totalUSD * (10 ** uint256(difference));
            }

            // second case: tokenDecimal is greater than 18
            // for tokens with more than 18 decimals 
            else if (stablecoinDecimal > 18) {

                // caclulate amount of decimals over 18
                difference = stablecoinDecimal - 18;

                // removes decimals to match 18
                totalUSD = totalUSD / (10 ** uint256(difference));
            }
        }

        // This should compute % value of Liq pool in Dai. Cannot have decimals in Solidity
        uint256 LPTValueInDai = totalUSD.mul(LPTamt).div(totalLPTokens);  
        
        // map locked tokens to user
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].add(LPTamt);

        // transfer LPT to the address
        transferLPT(LPTamt);

        // Call Valuing Contract
        valuingContract.unboundCreate(LPTValueInDai, msg.sender, uTokenAddr); // Hardcode "0" for AAA rating
        
    }

    // calls transfer only, for use with non-permit lock function
    function transferLPT(uint256 amount) internal {
        require(LPTContract.transferFrom(msg.sender, address(this), amount), "LLC: Trasfer From failed");

    }

    // calls permit, then transfer
    function transferLPTPermit(address user, uint256 amount, uint deadline, uint8 v, bytes32 r, bytes32 s) internal {
        LPTContract.permit(user, address(this), amount, deadline, v, r, s);
        require(LPTContract.transferFrom(msg.sender, address(this), amount), "LLC: Transfer From failed");
        
    }

    // Burn Path
    // 
    // allows for partial loan payment by using the ratio of LPtokens to unlock and total LPtokens locked
    function unlockLPT (uint256 LPToken, address uTokenAddr) public {
        require (_tokensLocked[msg.sender] >= LPToken, "Insufficient liquidity locked");
        require (LPToken > 0, "Cannot unlock nothing");

        // Burning of UND will happen first
        valuingContract.unboundRemove(LPToken, _tokensLocked[msg.sender], msg.sender, uTokenAddr);

        // update mapping
        _tokensLocked[msg.sender] = _tokensLocked[msg.sender].sub(LPToken);
        
        // send LP tokens back to user
        require(LPTContract.transfer(msg.sender, LPToken), "LLC: Transfer Failed");
        
    }
    
    function tokensLocked(address account) public view returns (uint256) {
        return _tokensLocked[account];
    }

    // onlyOwner Functions

    // Claim - remove any airdropped tokens
    // currently sends all tokens to "to" address (in param)
    function claimTokens(address _tokenAddr, address to) public onlyOwner {
        require(_tokenAddr != pair, "Cannot move LP tokens");
        uint256 tokenBal = erc20Template(_tokenAddr).balanceOf(address(this));
        require(erc20Template(_tokenAddr).transfer(to, tokenBal), "LLC: Transfer Failed");
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