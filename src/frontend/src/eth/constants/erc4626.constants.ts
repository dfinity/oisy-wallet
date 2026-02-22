// https://eips.ethereum.org/EIPS/eip-4626
export const ERC4626_ABI = [
	'function asset() view returns (address)',
	'function totalAssets() view returns (uint256)',
	'function convertToShares(uint256) view returns (uint256)',
	'function convertToAssets(uint256) view returns (uint256)',
	'function deposit(uint256,address) returns (uint256)',
	'function mint(uint256,address) returns (uint256)',
	'function withdraw(uint256,address,address) returns (uint256)',
	'function redeem(uint256,address,address) returns (uint256)'
];
