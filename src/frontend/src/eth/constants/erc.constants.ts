// The ERC-165 standard defines a method for contracts to declare which interfaces they implement. This allows other contracts and applications to query a contract to determine its capabilities.
// https://eips.ethereum.org/EIPS/eip-165
export enum Erc165Identifier {
	ERC165 = '0x01ffc9a7',
	ERC721 = '0x80ac58cd',
	ERC1155 = '0xd9b67a26',
	ERC1155_METADATA_URI = '0x0e89341c'
}

// The setApprovalForAll contract function prefix is 0xa22cb465. ERC-721 and ERC-1155 both define it,
// so the selector belongs to neither standard alone.
// https://eips.ethereum.org/EIPS/eip-721
// https://eips.ethereum.org/EIPS/eip-1155
export const ERC_SET_APPROVAL_FOR_ALL_HASH = '0xa22cb465';
