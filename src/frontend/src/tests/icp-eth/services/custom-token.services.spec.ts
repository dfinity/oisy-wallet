import { autoLoadCustomToken } from '$icp-eth/services/custom-token.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import * as agent from '$lib/actors/agents.ic';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcCustomTokens } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import type { HttpAgent } from '@dfinity/agent';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { get } from 'svelte/store';
import { expect } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('custom-token.services', () => {
	const backendCanisterMock = mock<BackendCanister>();
	const ledgerCanisterMock = mock<IcrcLedgerCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		// eslint-disable-next-line require-await
		vi.spyOn(BackendCanister, 'create').mockImplementation(async () => backendCanisterMock);

		vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);

		vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());
	});

	describe('autoLoadCustomToken', () => {
		it('should return "skipped" when the token standard does not match', async () => {
			const result = await autoLoadCustomToken({
				icrcCustomTokens: mockIcrcCustomTokens,
				sendToken: mockValidToken,
				identity: mockIdentity
			});

			expect(result.result).toBe('skipped');
		});

		const assertSetCustomToken = async ({
			customTokens,
			expectedVersion
		}: {
			customTokens: IcrcCustomToken[];
			expectedVersion: [] | [bigint];
		}) => {
			const spySetCustomToken = backendCanisterMock.setCustomToken.mockResolvedValue(undefined);
			const spyListCustomTokens = backendCanisterMock.listCustomTokens.mockResolvedValue([]);

			const mockSendToken = {
				...mockValidIcToken,
				twinTokenSymbol: customTokens[0].symbol,
				standard: 'erc20' as const
			};

			const { result } = await autoLoadCustomToken({
				icrcCustomTokens: customTokens,
				sendToken: mockSendToken,
				identity: mockIdentity
			});

			expect(result).toBe('loaded');

			expect(spySetCustomToken).toHaveBeenNthCalledWith(1, {
				token: {
					enabled: true,
					version: expectedVersion,
					token: {
						Icrc: {
							index_id: [Principal.fromText(mockSendToken.indexCanisterId)],
							ledger_id: Principal.fromText(mockSendToken.ledgerCanisterId)
						}
					}
				}
			});

			expect(spyListCustomTokens).toHaveBeenCalledWith({ certified: true });
		};

		it('should call setCustomToken with a new custom token', async () => {
			await assertSetCustomToken({ customTokens: mockIcrcCustomTokens, expectedVersion: [] });
		});

		it('should call setCustomToken to update a custom token', async () => {
			const customTokens: IcrcCustomToken[] = [
				{
					...mockIcrcCustomTokens[0],
					version: 1n
				},
				mockIcrcCustomTokens[1]
			];

			await assertSetCustomToken({
				customTokens,
				expectedVersion: [customTokens[0].version ?? 0n]
			});
		});

		it('should load tokens after set custom token', async () => {
			const mockSendToken = {
				...mockValidIcToken,
				twinTokenSymbol: mockIcrcCustomTokens[0].symbol,
				standard: 'erc20' as const
			};

			backendCanisterMock.setCustomToken.mockResolvedValue(undefined);
			const spyListCustomTokens = backendCanisterMock.listCustomTokens.mockResolvedValue([
				{
					token: {
						Icrc: {
							index_id: [Principal.fromText(mockSendToken.indexCanisterId)],
							ledger_id: Principal.fromText(mockSendToken.ledgerCanisterId)
						}
					},
					version: [1n],
					enabled: true
				}
			]);

			const spyMetadata = ledgerCanisterMock.metadata.mockResolvedValue([
				['icrc1:name', { Text: mockSendToken.name }],
				['icrc1:symbol', { Text: mockSendToken.symbol }],
				['icrc1:decimals', { Nat: BigInt(mockSendToken.decimals) }],
				['icrc1:fee', { Nat: mockSendToken.fee }]
			]);

			const { result } = await autoLoadCustomToken({
				icrcCustomTokens: mockIcrcCustomTokens,
				sendToken: mockSendToken,
				identity: mockIdentity
			});

			expect(result).toBe('loaded');

			expect(spyListCustomTokens).toHaveBeenCalledWith({ certified: true });

			expect(spyMetadata).toHaveBeenCalledWith({ certified: true });

			const store = get(icrcCustomTokensStore);

			expect(store).toHaveLength(1);
			expect(store).toEqual([
				{
					certified: true,
					data: expect.objectContaining({
						...mockValidIcToken,
						id: expect.any(Symbol),
						category: 'custom',
						position: 4,
						enabled: true,
						standard: 'icrc',
						version: 1n
					})
				}
			]);
		});
	});
});
