import type { NftError } from '$declarations/dip721/dip721.did';
import { CanisterInternalError } from '$lib/canisters/errors';

export const mapDip721NftError = (err: NftError): CanisterInternalError => {
	if ('UnauthorizedOperator' in err) {
		return new CanisterInternalError('Unauthorized operator');
	}

	if ('SelfTransfer' in err) {
		return new CanisterInternalError('Cannot transfer NFT to self');
	}

	if ('TokenNotFound' in err) {
		return new CanisterInternalError('NFT token not found');
	}

	if ('UnauthorizedOwner' in err) {
		return new CanisterInternalError('Unauthorized owner for the NFT');
	}

	if ('SelfApprove' in err) {
		return new CanisterInternalError('Cannot approve self for the NFT');
	}

	if ('OperatorNotFound' in err) {
		return new CanisterInternalError('Operator not found for the NFT');
	}

	if ('ExistedNFT' in err) {
		return new CanisterInternalError('NFT already exists');
	}

	if ('OwnerNotFound' in err) {
		return new CanisterInternalError('Owner not found for the NFT');
	}

	return new CanisterInternalError('Unknown Dip721CanisterError');
};
