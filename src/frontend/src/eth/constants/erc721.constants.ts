// https://ethereum.org/en/developers/docs/standards/tokens/erc-721
// https://eips.ethereum.org/EIPS/eip-721
export const ERC721_ABI = [
	'function name() view returns (string)',
	'function symbol() view returns (string)',
	'function tokenURI(uint256 tokenId) view returns (string)',
	'function safeTransferFrom(address from, address to, uint256 tokenId)'
];
