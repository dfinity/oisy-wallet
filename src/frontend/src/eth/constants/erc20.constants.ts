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
	'function DOMAIN_SEPARATOR() view returns (bytes32)'
];

// We assumed that ERC20 approve contract function prefix is 0x095ea7b3
// https://sepolia.etherscan.io/address/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984#writeContract#F1
export const ERC20_APPROVE_HASH = '0x095ea7b3';

// Use when UNPREDICTABLE_GAS_LIMIT error are thrown while fetching the fee data.
// See: https://docs.ethers.org/v5/troubleshooting/errors/#help-UNPREDICTABLE_GAS_LIMIT
export const ERC20_FALLBACK_FEE = 500_000n;
