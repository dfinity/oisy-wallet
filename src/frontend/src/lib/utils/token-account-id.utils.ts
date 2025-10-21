import { getBtcAddressString } from '$btc/utils/btc-address.utils';
import type { TokenAccountId } from '$declarations/backend/declarations/backend.did';
import { getIcrcv2AccountIdString } from '$icp/utils/icp-account.utils';
import {
	TOKEN_ACCOUNT_ID_TO_NETWORKS,
	TOKEN_ACCOUNT_ID_TYPES_SORT_ORDER
} from '$lib/constants/token-account-id.constants';
import type { Network } from '$lib/types/network';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import { assertNever } from '@dfinity/utils';

export const getTokenAccountIdAddressString = (tokenAccountId: TokenAccountId): string => {
	if ('Btc' in tokenAccountId) {
		return getBtcAddressString(tokenAccountId.Btc);
	}
	if ('Eth' in tokenAccountId) {
		return tokenAccountId.Eth.Public;
	}
	if ('Icrcv2' in tokenAccountId) {
		return getIcrcv2AccountIdString(tokenAccountId.Icrcv2);
	}
	if ('Sol' in tokenAccountId) {
		return tokenAccountId.Sol;
	}

	assertNever(tokenAccountId, `Unexpected TokenAccountId: ${tokenAccountId}`);
};

export const getDiscriminatorForTokenAccountId = (
	tokenAccountId: TokenAccountId
): TokenAccountIdTypes => {
	if ('Btc' in tokenAccountId) {
		return 'Btc';
	}
	if ('Eth' in tokenAccountId) {
		return 'Eth';
	}
	if ('Icrcv2' in tokenAccountId) {
		return 'Icrcv2';
	}
	if ('Sol' in tokenAccountId) {
		return 'Sol';
	}

	assertNever(tokenAccountId, `Unexpected TokenAccountId: ${tokenAccountId}`);
};

export const getNetworksForTokenAccountIdType = (addressType: TokenAccountIdTypes): Network[] =>
	TOKEN_ACCOUNT_ID_TO_NETWORKS[addressType];

export const compareTokenAccountIdTypes = ({
	a,
	b
}: {
	a: TokenAccountIdTypes;
	b: TokenAccountIdTypes;
}): number => {
	const orderA = TOKEN_ACCOUNT_ID_TYPES_SORT_ORDER[a];
	const orderB = TOKEN_ACCOUNT_ID_TYPES_SORT_ORDER[b];
	return orderA - orderB;
};
