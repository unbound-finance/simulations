// SPDX-License-Identifier: MIT

pragma solidity >=0.4.23 <0.8.0;

import "../openzeppelin/GSN/Context.sol";
import "../openzeppelin/token/ERC20/IERC20.sol";
import "../openzeppelin/math/SafeMath.sol";
import "../openzeppelin/utils/Address.sol";

// ---------------------------------------------------------------------------------------
//                                   Unbound Dollar (UND)
//         
//                                     By: Unbound Finance
// ---------------------------------------------------------------------------------------
// This contract holds the erc20 token call UND. This is the token we will be issuing
// our loans in. This contract contains custom mint and burn functions, only callable from
// an authorized valuing contract. As this contract will be first to be deployed, the 
// valuing contract must be authorized by owner.
//
// The loan fee is computed on minting, and the amount distributed to the UND liquidity pool 
// (as a reward for liquidity holders), the SAFU fund, and the dev fund. Initial split is 
// determined in the constructor. The UND liquidity pool address must be updated on this 
// contract by owner once it is created from the uniswap factory.
// ----------------------------------------------------------------------------------------


contract UnboundDai is Context, IERC20 {
    using SafeMath for uint256;
    using Address for address;

    event Mint(address user, uint256 newMint);
    event Burn(address user, uint256 burned);

    mapping (address => uint256) private _balances;

    mapping (address => mapping (address => uint256)) private _allowances;

    uint256 public _totalSupply;

    string public _name;
    string public _symbol;
    uint8 public _decimals;


    // PERMIT VARIABLES
    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint) public nonces;

    // staking contract address (40%)
    address public _stakeAddr;

    // Emergency fund (40%)
    address public _safuAddr;

    // Dev fund (20%)
    address public _devFundAddr;

    // Dev Fund split variables
    // the raw fee is divided by 20 to compute a share equal to 5% of the raw fee
    // these variables are multiplied by this share, to produce %s of the raw fee in multiples of 5.
    // i.e. a value of 8 corresponds to 40% of raw value. 8 * 5% = 40%
    uint256 public _stakeShares;
    uint256 public _safuShares;



    // tracks user loan amount in UND. This is the amount of UND they need to pay back to get all locked tokens returned. 
    mapping (address => mapping (address => uint256)) private _minted;

    //Owner Address
    address public _owner;

    //Valuator Contract Address
    address public _valuator;

    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    modifier onlyValuator() {
        require(msg.sender == _valuator, "Call does not originate from Valuator");
        _;
    }

    constructor (string memory name, string memory symbol, address Safu, address devFund) public {
        _name = name;
        _symbol = symbol;
        _decimals = 18;
        _owner = msg.sender;
        _totalSupply = 0;
        _safuAddr = Safu;
        _devFundAddr = devFund;

        // we will use 40/40/20 split of fees
        _stakeShares = 8;
        _safuShares = 8;

        // MUST BE MANUALLY CHANGED TO UND LIQ pool.
        _stakeAddr = Safu;

        uint chainId;
        // get chainId of the chain, required for permit
        assembly {
            chainId := chainid()
        }

        // To verify permit() signature
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)),
            keccak256(bytes('1')),
            chainId,
            address(this)
        ));
    }

    function name() public view returns (string memory) {
        return _name;
    }

   
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    
    function decimals() public view returns (uint8) {
        return _decimals;
    }

   
    function totalSupply() public override view returns (uint256) {
        return _totalSupply;
    }


    function balanceOf(address account) public override view returns (uint256) {
        return _balances[account];
    }

    //  PERMIT FUNCTION
    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, 'UnboundDollar: EXPIRED');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
            )
        );
        // check if the data is signed by owner
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, 'UnboundDollar: INVALID_SIGNATURE');
        _approve(owner, spender, value);
    }

    // Transfer and transferFrom
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        //_beforeTokenTransfer(sender, recipient, amount);

        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }
    
    function allowance(address owner, address spender) public override view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }

    
    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    
    // MINT: Only callable by valuing contract - Now splits fees
    function _mint(address account, uint256 amount, uint256 fee, address LLCAddr) external virtual {
        require(account != address(0), "ERC20: mint to the zero address");
        require(msg.sender == _valuator, "Call does not originate from Valuator");
        // _beforeTokenTransfer(address(0), account, amount);
        
        
        uint256 feeAmount = amount.div(fee); // fee variable should be 400 to produce 0.25%
        
        // The amount the user will receive
        uint256 toMint = amount.sub(feeAmount);
        
        // Splitting of fees
        uint256 share = feeAmount.div(20);

        // crediting loan to user
        _minted[account][LLCAddr] = _minted[account][LLCAddr].add(amount);

        // adding total amount of new tokens to totalSupply
        _totalSupply = _totalSupply.add(amount);

        // Credits user with their uDai loan, minus fees
        _balances[account] = _balances[account].add(toMint);

        // sends 40% to staking. MUST SET uDai Liquidity pool first
        _balances[_stakeAddr] = _balances[_stakeAddr].add(share.mul(_stakeShares));

        // sends 40% to Safu Fund
        _balances[_safuAddr] = _balances[_safuAddr].add(share.mul(_safuShares));

        // sends the remaineder to dev fund
        // this formula is to ensure remainders dropped by integer division are not accidentally burned
        _balances[_devFundAddr] = _balances[_devFundAddr].add(feeAmount.sub(share.mul(_safuShares.add(_stakeShares))));

        emit Mint(account, amount);
    }

    // BURN function. Only callable from Valuing.
    function _burn(address account, uint256 toBurn, address LLCAddr) external virtual {
        require(account != address(0), "ERC20: burn from the zero address");
        require(msg.sender == _valuator, "Call does not originate from Valuator");
        require(_minted[account][LLCAddr] > 0, "You have no loan");
        
        // checks if user has enough uDai to cover loan and 0.25% fee
        require(toBurn != _minted[account][LLCAddr], "Dupa");
        require(_balances[account] >= toBurn, "Insufficient uDai to pay back loan");

        // removes the amount of uDai to burn from _minted mapping/
        _minted[account][LLCAddr] = _minted[account][LLCAddr].sub(toBurn);
        
        // Removes loan AND fee from user balance
        _balances[account] = _balances[account].sub(toBurn, "ERC20: burn amount exceeds balance");

        // Removes the loan amount of uDai from circulation
        _totalSupply = _totalSupply.sub(toBurn);

        // This event could be renamed for easier identification.
        emit Burn(account, toBurn);
    }

    // Checks how much uDai the user has minted (and owes to get liquidity back)
    function checkLoan(address user, address lockLocation) public view returns (uint256 owed) {
        owed = _minted[user][lockLocation];
    }
    
    // onlyOwner Functions

    // change safuShare
    function changeSafuShare(uint256 rate) public onlyOwner {
        require(rate <= 20 && rate > 0, "bad input");
        _safuShares = rate;
    }

    // change stakeShare
    function changeStakeShare(uint256 rate) public onlyOwner {
        require(rate <= 20 && rate > 0, "bad input");
        _stakeShares = rate;
    }

    // Changes stakingAddr
    function changeStaking(address newStaking) public onlyOwner {
        _stakeAddr = newStaking;
    }

    // Changes safuFund
    function changeSafuFund(address newSafuFund) public onlyOwner {
        _safuAddr = newSafuFund;
    }

    // Changes devFund
    function changeDevFund(address newDevFund) public onlyOwner {
        _devFundAddr = newDevFund;
    }

    // Changes Valuator Contract Address
    function changeValuator(address newValuator) public onlyOwner {
        _valuator = newValuator;
    }

    // Checks if sender is owner
    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    // Changes owner
    function setOwner(address _newOwner) public onlyOwner {
        _owner = _newOwner;
    }
}
