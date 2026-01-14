import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { loadAndAssertAddCustomToken } from '$icp/services/icpunks-add-custom-tokens.service';
import type { IcPunksTokenWithoutId } from '$icp/types/icpunks-token';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockICatsCanisterId2, mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('icpunks-add-custom-tokens.service', () => {
	describe('loadAndAssertAddCustomToken', () => {
		const mockCanisterId = mockIcPunksCanisterId;

		let spyToastsError: MockInstance;

		const validParams = {
			identity: mockIdentity,
			icPunksTokens: [],
			canisterId: mockCanisterId
		};

		const expectedName = shortenWithMiddleEllipsis({ text: mockCanisterId });

		const expectedToken: IcPunksTokenWithoutId = {
			canisterId: mockCanisterId,
			standard: { code: 'icpunks' },
			category: 'custom',
			name: expectedName,
			symbol: expectedName,
			decimals: 0,
			network: ICP_NETWORK
		};

		beforeEach(() => {
			vi.clearAllMocks();

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');
		});

		it('should return error if identity is missing', () => {
			expect(() =>
				loadAndAssertAddCustomToken({
					...validParams,
					identity: undefined
				})
			).toThrowError();
		});

		it('should return error if canisterId is missing', () => {
			const { canisterId: _, ...params } = validParams;

			const result = loadAndAssertAddCustomToken(params);

			expect(result).toEqual({ result: 'error' });

			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.import.error.missing_canister_id }
			});
		});

		it('should return error if token is already available', () => {
			const result = loadAndAssertAddCustomToken({
				...validParams,
				icPunksTokens: [
					{
						...expectedToken,
						id: parseTokenId('test')
					}
				]
			});

			expect(result).toEqual({ result: 'error' });

			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.error.already_available }
			});
		});

		it('should return error if token already exists', () => {
			const result = loadAndAssertAddCustomToken({
				identity: mockIdentity,
				icPunksTokens: [
					{
						...expectedToken,
						id: parseTokenId('test'),
						canisterId: mockICatsCanisterId2
					}
				],
				canisterId: mockCanisterId
			});

			expect(result).toEqual({ result: 'error' });

			expect(spyToastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).tokens.error.duplicate_metadata }
			});
		});

		it('should successfully load a new token', () => {
			const result = loadAndAssertAddCustomToken(validParams);

			expect(result).toStrictEqual({ result: 'success', data: { token: expectedToken } });
		});
	});
});
