import type { CustomToken } from '$declarations/backend/backend.did';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import {
	deleteIdbEthTokens,
	deleteIdbIcTokens,
	deleteIdbSolTokens,
	getIdbEthTokens,
	getIdbIcTokens,
	getIdbSolTokens,
	setIdbTokensStore
} from '$lib/api/idb-tokens.api';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
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

	describe('getIdbIcTokens', () => {
		it('should get IC tokens', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(mockTokens);

			const result = await getIdbIcTokens(mockPrincipal);

			expect(result).toEqual(mockTokens);
			expect(idbKeyval.get).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});
	});

	describe('getIdbEthTokens', () => {
		it('should get ETH tokens', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(mockTokens);

			const result = await getIdbEthTokens(mockPrincipal);

			expect(result).toEqual(mockTokens);
			expect(idbKeyval.get).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});
	});

	describe('getIdbSolTokens', () => {
		it('should get SOL tokens', async () => {
			vi.mocked(idbKeyval.get).mockResolvedValue(mockTokens);

			const result = await getIdbSolTokens(mockPrincipal);

			expect(result).toEqual(mockTokens);
			expect(idbKeyval.get).toHaveBeenCalledWith(mockPrincipal.toText(), expect.any(Object));
		});
	});

	describe('deleteIdbIcTokens', () => {
		it('should delete IC tokens', async () => {
			await deleteIdbIcTokens(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledOnce();
			expect(idbKeyval.del).toHaveBeenNthCalledWith(1, mockPrincipal.toText(), expect.any(Object));
		});
	});

	describe('deleteIdbEthTokens', () => {
		it('should delete ETH tokens', async () => {
			await deleteIdbEthTokens(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledOnce();
			expect(idbKeyval.del).toHaveBeenNthCalledWith(1, mockPrincipal.toText(), expect.any(Object));
		});
	});

	describe('deleteIdbSolTokens', () => {
		it('should delete SOL tokens', async () => {
			await deleteIdbSolTokens(mockPrincipal);

			expect(idbKeyval.del).toHaveBeenCalledOnce();
			expect(idbKeyval.del).toHaveBeenNthCalledWith(1, mockPrincipal.toText(), expect.any(Object));
		});
	});
});
