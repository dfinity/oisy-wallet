import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { loadAndAssertAddCustomToken } from '$icp/services/ext-add-custom-tokens.service';
import type { ExtTokenWithoutId } from '$icp/types/ext-token';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import {
	mockExtV2TokenCanisterId,
	mockExtV2TokenCanisterId3
} from '$tests/mocks/ext-v2-token.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('ext-add-custom-tokens.service', () => {
	describe('loadAndAssertAddCustomToken', () => {
		const mockCanisterId = mockExtV2TokenCanisterId;

		let spyToastsError: MockInstance;

		const validParams = {
			identity: mockIdentity,
			extTokens: [],
			canisterId: mockCanisterId
		};

		const expectedName = shortenWithMiddleEllipsis({ text: mockCanisterId });

		const expectedToken: ExtTokenWithoutId = {
			canisterId: mockCanisterId,
			standard: 'extV2',
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
			).toThrow();
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
				extTokens: [
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
				extTokens: [
					{
						...expectedToken,
						id: parseTokenId('test'),
						canisterId: mockExtV2TokenCanisterId3
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
