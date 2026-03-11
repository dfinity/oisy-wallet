// https://ethereum.org/en/developers/docs/standards/tokens/erc-20/
export const ERC20_ABI = [
	'function name() public view returns (string)',
	'function symbol() public view returns (string)',
	'function decimals() public view returns (uint8)',
	'function totalSupply() public view returns (uint256)',
	'function balanceOf(address _owner) public view returns (uint256 balance)',
	'function transfer(address _to, uint256 _value) public returns (bool success)',
	'function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)',
	'function approve(address _spender, uint256 _value) public returns (bool success)',
	'function allowance(address _owner, address _spender) public view returns (uint256 remaining)',
	'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
	'event Approval(address indexed _owner, address indexed _spender, uint256 _value)'
];

// We need to check whether an ERC-20 token supports EIP-2612 (Permit).
// Not all ERC-20 tokens implement it, so this ABI is kept separate to avoid breaking logic.
// Spec: https://eips.ethereum.org/EIPS/eip-2612
export const ERC20_PERMIT_ABI = [
	'function nonces(address owner) view returns (uint256)',
	'function version() view returns (string)',
	'function DOMAIN_SEPARATOR() view returns (bytes32)'
];

// The ERC20 approve contract function prefix is 0x095ea7b3
// https://etherscan.io/tx/0x9a5c9c548a71b839682919b4632bc77b401a5f8992fc866134fc363d22f8b5a0
export const ERC20_APPROVE_HASH = '0x095ea7b3';

// The ERC20 deposit contract function prefix is 0x26b3293f
// https://etherscan.io/tx/0x8ec324a6e4290540ac355cc506b4caafa8fc925dda226b0db4b02d44f9039df6
export const ERC20_DEPOSIT_HASH = '0x26b3293f';

// The ERC20 deposit contract function prefix is 0xdb9751af
// https://etherscan.io/tx/0x6d6027a32a817833daa02ca4a6fa7fb4b22ce18570f0a6f1ddaf03dd06776a5b
export const ERC20_DEPOSIT_ERC20_HASH = '0xdb9751af';

// The ERC20 transfer contract function prefix is 0xa9059cbb
// https://polygonscan.com/tx/0x99358ec7a9b45aec7f9587ae48edc06528d1c600db53329b9c1eebb10ce64640
export const ERC20_TRANSFER_HASH = '0xa9059cbb';

// Use when UNPREDICTABLE_GAS_LIMIT error are thrown while fetching the fee data.
// See: https://docs.ethers.org/v5/troubleshooting/errors/#help-UNPREDICTABLE_GAS_LIMIT
export const ERC20_FALLBACK_FEE = 500_000n;
