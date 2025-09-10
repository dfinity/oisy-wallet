// https://ethereum.org/en/developers/docs/standards/tokens/erc-1155
// https://eips.ethereum.org/EIPS/eip-1155
export const ERC1155_ABI = [
	'function name() view returns (string)',
	'function symbol() view returns (string)',
	'function balanceOf(address _owner, uint256 _id) view returns (uint256)',
	'function uri(uint256 tokenId) view returns (string)',
	'function safeTransferFrom(address from, address to, uint256 tokenId, uint256 amount, bytes data)'
];
