import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { icrcUnavailableCustomTokensStore } from '$icp/stores/icrc-unavailable-custom-tokens.store';
import type { IcrcUnavailableCustomToken } from '$icp/types/icrc-custom-token';
import { mockCustomTokens } from '$tests/mocks/custom-tokens.mock';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { get } from 'svelte/store';

describe('icrc-unavailable-custom-tokens.store', () => {
	const [firstCustomToken, secondCustomToken] = mockCustomTokens;

	const firstToken: IcrcUnavailableCustomToken = {
		ledgerCanisterId: mockLedgerCanisterId,
		customToken: firstCustomToken
	};

	const secondToken: IcrcUnavailableCustomToken = {
		ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
		customToken: secondCustomToken
	};

	beforeEach(() => {
		icrcUnavailableCustomTokensStore.reset();
	});

	it('should hold the tokens it is given', () => {
		icrcUnavailableCustomTokensStore.set([firstToken, secondToken]);

		expect(get(icrcUnavailableCustomTokensStore)).toEqual([firstToken, secondToken]);
	});

	it('should remove a deleted token', () => {
		icrcUnavailableCustomTokensStore.set([firstToken, secondToken]);

		icrcUnavailableCustomTokensStore.remove(firstToken.ledgerCanisterId);

		expect(get(icrcUnavailableCustomTokensStore)).toEqual([secondToken]);
	});

	it('should keep a deleted token out of every later write', () => {
		icrcUnavailableCustomTokensStore.set([firstToken, secondToken]);

		icrcUnavailableCustomTokensStore.remove(firstToken.ledgerCanisterId);

		// A loading round that read the saved tokens before the delete.
		icrcUnavailableCustomTokensStore.set([firstToken, secondToken]);

		expect(get(icrcUnavailableCustomTokensStore)).toEqual([secondToken]);
	});

	it('should forget the deleted tokens on reset', () => {
		icrcUnavailableCustomTokensStore.set([firstToken]);

		icrcUnavailableCustomTokensStore.remove(firstToken.ledgerCanisterId);

		icrcUnavailableCustomTokensStore.reset();

		expect(get(icrcUnavailableCustomTokensStore)).toEqual([]);

		icrcUnavailableCustomTokensStore.set([firstToken]);

		expect(get(icrcUnavailableCustomTokensStore)).toEqual([firstToken]);
	});
});
