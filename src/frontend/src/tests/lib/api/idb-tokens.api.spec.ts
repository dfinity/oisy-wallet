import type { CustomToken } from '$declarations/backend/backend.did';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { setIdbTokensStore } from '$lib/api/idb-tokens.api';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';
import * as idbKeyval from 'idb-keyval';
import { createStore } from 'idb-keyval';

vi.mock('idb-keyval', () => ({
	createStore: vi.fn(() => ({
		/* mock store implementation */
	})),
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn(),
	update: vi.fn()
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

describe('idb-tokens.api', () => {
	const mockIdbTokensStore = createStore('mock-store', 'mock-store');

	const mockTokens: CustomToken[] = [
		{
			token: {
				Icrc: {
					ledger_id: Principal.fromText(mockLedgerCanisterId),
					index_id: toNullable(Principal.fromText(mockIndexCanisterId))
				}
			},
			version: toNullable(2n),
			enabled: true
		},
		{
			token: {
				Icrc: { ledger_id: Principal.fromText(IC_CKETH_LEDGER_CANISTER_ID), index_id: toNullable() }
			},
			version: toNullable(1n),
			enabled: false
		},
		{
			token: {
				SplDevnet: {
					decimals: toNullable(18),
					symbol: toNullable(),
					token_address: BONK_TOKEN.address
				}
			},
			version: toNullable(),
			enabled: true
		}
	];

	const mockParams = {
		identity: mockIdentity,
		idbTokensStore: mockIdbTokensStore,
		tokens: mockTokens
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('setIdbTokensStore', () => {
		it('should not set the tokens in the IDB if the identity is nullish', async () => {
			await setIdbTokensStore({
				...mockParams,
				identity: null
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();

			await setIdbTokensStore({
				...mockParams,
				identity: undefined
			});

			expect(idbKeyval.set).not.toHaveBeenCalled();
		});

		it('should set the transactions in the IDB', async () => {
			await setIdbTokensStore({
				...mockParams
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				mockTokens,
				mockIdbTokensStore
			);
		});

		it('should handle emtpy tokens list', async () => {
			await setIdbTokensStore({
				...mockParams,
				tokens: []
			});

			expect(idbKeyval.set).toHaveBeenCalledOnce();
			expect(idbKeyval.set).toHaveBeenNthCalledWith(
				1,
				mockIdentity.getPrincipal().toText(),
				[],
				mockIdbTokensStore
			);
		});
	});
});
