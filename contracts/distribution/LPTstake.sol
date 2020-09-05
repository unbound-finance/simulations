pragma solidity ^0.6.2;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface uDaiERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address _to, uint _value) external returns (bool success);
    function balanceOf(address account) external view returns (uint256);
}

interface daiInterface {
    // from DAI
    // function transferFrom(address src, address dst, uint wad)
    // function transfer(address dst, uint wad) external returns (bool)

    // for Testing
    function transferFrom(address from, address to, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface LPT {
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

interface routerInterface {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
}

// Liquidity Lock Contract for ETH/DAI pair
contract unboundStaking {
    using SafeMath for uint256;
    using Address for address;

    // Events
    event Staked (address indexed user, uint256 liquidityTokens);
    event UnStaked (address indexed user);
    event Claim (address indexed user);

    //Owner Address
    address _owner;

    // fee splitting contract
    address _feeSplitterAddr;

    // uDai and Dai addresses
    address _uDaiAddr;
    address _daiAddr;

    // tracks uDai that has been credited to stakers
    // call balanceOf(address(this)) from uDai, minus _trackedTokens to get tokens waiting to be split
    uint256 public _trackedRewardUdai;

    // Liquidity tokens locked by users
    mapping (address => uint256) public _liquidityLocked;

    // amount of rewards earned
    mapping (address => uint256) public _stakeReward;

    // is user staking?
    mapping (address => bool) public _isStaked;

    // array of stakers
    address[] public stakeList;

    // interfaces
    LPT private LPTContract;
    uDaiERC20 private uDaiContract;
    daiInterface private daiContract;
    routerInterface private router;

    // Modifiers
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    // Constructor
    // LPTaddress is for uDai/Dai
    constructor (address LPTaddress, address feeSplitter, address uDai, address dai, address routerAddr) public {
        _owner = msg.sender;

        // sets addresses and initiates interfaces
        _feeSplitterAddr = feeSplitter;

        _uDaiAddr = uDai;
        _daiAddr = dai;

        LPTContract = LPT(LPTaddress);
        uDaiContract = uDaiERC20(uDai);
        daiContract = daiInterface(dai);
        router = routerInterface(routerAddr);

        // add an item to array so its size is not 0
        stakeList.push(msg.sender);
    }

    // STAKE function
    // uDai and Dai must be given approval to this contract address for this function to work!!
    function stake (uint256 uDai, uint256 Dai) public {
        require (uDaiContract.balanceOf(msg.sender) >= uDai, "insufficient uDai");
        require (daiContract.balanceOf(msg.sender) >= Dai, "insufficient dai");

        // transfers uDai and Dai to this contract
        uDaiContract.transferFrom(msg.sender, address(this), uDai);
        daiContract.transferFrom(msg.sender, address(this), Dai);

        // calculate Minimums (10% below given amount for now)
        uint256 uDaiMin = uDai.sub(uDai.div(10));
        uint256 daiMin = Dai.sub(Dai.div(10));

        // mints liquidity
        // Assumes DAI is token0, uDai token1
        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(_daiAddr, _uDaiAddr, Dai, uDai, daiMin, uDaiMin, address(this), block.timestamp.add(600));


        // splits pot
        splitPot();
        
        // credits user with locked liquidity
        _liquidityLocked[msg.sender] = _liquidityLocked[msg.sender].add(liquidity);

        

        // if user has not yet staked, adds them to the list.
        if (!_isStaked[msg.sender]) {
            addToStakerList(msg.sender);

            // sets staking status to true
            _isStaked[msg.sender] = true;
        }

        emit Staked (msg.sender, liquidity);
    }

    // loops through existing stakeList and checks if any spots can be reused. If not, increases array by 1.
    function addToStakerList(address newStaker) internal returns (bool){
        for (uint i = 0; i < stakeList.length; i++) {
            if (!_isStaked[stakeList[i]]) {
                stakeList[i] = newStaker;
                return true;
            }
        }
        stakeList.push(newStaker);
        return false;
    }

    // msg.sender must be the staker
    function removeStaker(uint256 daiMin, uint256 uDaiMin) public {
        require (_isStaked[msg.sender], "you are not staking");
        require (_liquidityLocked[msg.sender] > 0, "you do not have any locked liquidity");

        // splits pot and withdraws
        claim();


        // return liquidity
        router.removeLiquidity(_daiAddr, _uDaiAddr, _liquidityLocked[msg.sender], daiMin, uDaiMin, msg.sender, block.timestamp.add(600));

        // reset user variables
        _liquidityLocked[msg.sender] = 0;
        _isStaked[msg.sender] = false;

        emit UnStaked (msg.sender);
    }

    // splits collected fees among users, and credits them.
    function splitPot() internal returns (bool) {

        // calculate how much Reward is available to split
        uint256 totalUdai = uDaiContract.balanceOf(address(this));
        uint256 toSplit = totalUdai.sub(_trackedRewardUdai);

        // if toSplit is small (close to 0), end this function early
        if (toSplit < 10) {
            return false;
        }
        // possibility for dust creation in this contract (in the for loop)

        // get total amount of liquidity staked
        uint256 totalLiquidity = LPTContract.balanceOf(address(this));

        // loops through stakeList, gives rewards to addresses who are staked
        for (uint i = 0; i < stakeList.length; i++) {

            // skips addresses that are not staking
            if (_isStaked[stakeList[i]]) {
                address staker = stakeList[i];

                // calculates reward
                uint256 reward = toSplit.mul(_liquidityLocked[staker]).div(totalLiquidity);

                // adds reward amount to mapping
                _stakeReward[staker] = _stakeReward[staker].add(reward);

                // increases the trackedUdai variable
                _trackedRewardUdai = _trackedRewardUdai.add(reward);

            }
        }
        return true;
    }

    // Must be called by msg.sender
    function claim() public {

        // checks if user is staking
        require(_isStaked[msg.sender], "you are not staked");

        // splits any unaccounted for funds
        splitPot();

        // sends the users Reward amount in uDai
        uDaiContract.transfer(msg.sender, _stakeReward[msg.sender]);

        // subtracts the removed uDai from tracking
        _trackedRewardUdai = _trackedRewardUdai.sub(_stakeReward[msg.sender]);

        // resets user reward variable
        _stakeReward[msg.sender] = 0;

        emit Claim(msg.sender);
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

}