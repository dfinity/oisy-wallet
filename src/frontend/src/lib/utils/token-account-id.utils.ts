import { getBtcAddressString } from '$btc/utils/btc-address.utils';
import type { TokenAccountId } from '$declarations/backend/backend.did';
import { TOKEN_ACCOUNT_ID_TO_NETWORKS } from '$lib/constants/token-account-id.constants';
import type { Network } from '$lib/types/network';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import { assertNever } from '$lib/types/utils';

export const getTokenAccountIdAddressString = (tokenAccountId: TokenAccountId): string => {
	if ('Btc' in tokenAccountId) {
		return getBtcAddressString(tokenAccountId.Btc);
	}
	if ('Eth' in tokenAccountId) {
		return tokenAccountId.Eth.Public;
	}
	if ('Icrcv2' in tokenAccountId) {
		// TODO PR: https://github.com/dfinity/oisy-wallet/pull/6716
		throw new Error('Not implemented yet');
	}
	if ('Sol' in tokenAccountId) {
		return tokenAccountId.Sol;
	}

	return assertNever({ variable: tokenAccountId, typeName: 'TokenAccountId' });
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

	return assertNever({ variable: tokenAccountId, typeName: 'TokenAccountId' });
};

export const getNetworksForTokenAccountIdType = (addressType: TokenAccountIdTypes): Network[] =>
	TOKEN_ACCOUNT_ID_TO_NETWORKS[addressType];
