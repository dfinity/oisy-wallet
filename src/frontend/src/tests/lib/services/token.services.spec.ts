import type { SaveUserToken } from '$eth/services/erc20-user-tokens.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import {
	autoLoadSingleToken,
	autoLoadToken,
	loadTokenAndRun,
	type AutoLoadSingleTokenParams,
	type AutoLoadTokenParams
} from '$lib/services/token.services';
import { busy } from '$lib/stores/busy.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { token } from '$lib/stores/token.store';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { get } from 'svelte/store';
import type { Mock, MockInstance } from 'vitest';

describe('token.services', () => {
	const mockCallback = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('loadTokenAndRun', () => {
		it('should set the token in tokenStore', async () => {
			await loadTokenAndRun({ token: mockValidToken, callback: mockCallback });
			const tokenStore = get(token);

			expect(tokenStore).toBe(mockValidToken);
		});

		it('should call the callback function', async () => {
			await loadTokenAndRun({ token: mockValidToken, callback: mockCallback });

			expect(mockCallback).toHaveBeenCalled();
		});

		it('should handle asynchronous callback', () =>
			new Promise<void>((done) => {
				// eslint-disable-next-line require-await
				const callback = async () => {
					done();
				};

				loadTokenAndRun({ token: mockValidToken, callback });
			}));

		it('should throw an error if callback fails', async () => {
			const failingCallback = vi.fn().mockRejectedValue(new Error('Callback failed'));

			await expect(
				loadTokenAndRun({ token: mockValidToken, callback: failingCallback })
			).rejects.toThrow('Callback failed');

			const tokenStore = get(token);

			expect(tokenStore).toBe(mockValidToken);
			expect(failingCallback).toHaveBeenCalled();
		});
	});

	describe('autoLoadSingleToken', () => {
		let mockSetToken: Mock;
		let mockLoadTokens: Mock;

		const mockErrorMessage = 'Error loading token';

		let params: AutoLoadSingleTokenParams<IcrcCustomToken>;

		let spyToastsError: MockInstance;
		let spyBusyStart: MockInstance;
		let spyBusyStop: MockInstance;

		beforeEach(() => {
			mockSetToken = vi.fn();
			mockLoadTokens = vi.fn();

			params = {
				token: mockIcrcCustomToken,
				identity: mockIdentity,
				setToken: mockSetToken,
				loadTokens: mockLoadTokens,
				errorMessage: mockErrorMessage
			};

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');
			spyBusyStart = vi.spyOn(busy, 'start');
			spyBusyStop = vi.spyOn(busy, 'stop');
		});

		it('should return "skipped" if token is nullish', async () => {
			const result = await autoLoadSingleToken({ ...params, token: undefined });

			expect(result.result).toBe('skipped');
		});

		it('should return "skipped" if token is already enabled', async () => {
			const result = await autoLoadSingleToken({
				...params,
				token: { ...mockIcrcCustomToken, enabled: true }
			});

			expect(result.result).toBe('skipped');
		});

		it('should return "error" if setToken fails and show toast error', async () => {
			const error = new Error('Set token failed');

			mockSetToken.mockRejectedValue(error);

			const { result } = await autoLoadSingleToken(params);

			expect(result).toBe('error');

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: mockErrorMessage },
				err: error
			});

			expect(spyBusyStart).toHaveBeenCalledOnce();
			expect(spyBusyStop).toHaveBeenCalledOnce();
		});

		it('should enable token, reload tokens, and return "loaded" on success', async () => {
			mockSetToken.mockResolvedValue(undefined);
			mockLoadTokens.mockResolvedValue(undefined);

			const { result } = await autoLoadSingleToken(params);

			expect(result).toBe('loaded');

			expect(mockSetToken).toHaveBeenCalledWith({
				identity: mockIdentity,
				token: params.token,
				enabled: true
			});
			expect(mockLoadTokens).toHaveBeenCalledWith({ identity: mockIdentity });

			expect(spyBusyStart).toHaveBeenCalledOnce();
			expect(spyBusyStop).toHaveBeenCalledOnce();
		});
	});

	describe('autoLoadToken', () => {
		let mockAssertSendTokenData: Mock;
		let mockFindToken: Mock;
		let mockSetToken: Mock;
		let mockLoadTokens: Mock;

		const mockErrorMessage = 'Error loading token';

		let params: AutoLoadTokenParams<SaveUserToken, Erc20Token>;

		let spyToastsError: MockInstance;
		let spyBusyStart: MockInstance;
		let spyBusyStop: MockInstance;

		beforeEach(() => {
			mockAssertSendTokenData = vi.fn();
			mockFindToken = vi.fn();
			mockSetToken = vi.fn();
			mockLoadTokens = vi.fn();

			params = {
				tokens: [],
				sendToken: mockValidToken as Erc20Token,
				identity: mockIdentity,
				expectedSendTokenStandard: mockValidToken.standard,
				assertSendTokenData: mockAssertSendTokenData,
				findToken: mockFindToken,
				setToken: mockSetToken,
				loadTokens: mockLoadTokens,
				errorMessage: mockErrorMessage
			};

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');
			spyBusyStart = vi.spyOn(busy, 'start');
			spyBusyStop = vi.spyOn(busy, 'stop');
		});

		it('should return "skipped" if token standard does not match expected standard', async () => {
			const result = await autoLoadToken({
				...params,
				expectedSendTokenStandard: 'erc20' as const
			});

			expect(result.result).toBe('skipped');
		});

		it('should return "skipped" if assertSendTokenData returns skipped', async () => {
			mockAssertSendTokenData.mockReturnValue({ result: 'skipped' });

			const result = await autoLoadToken(params);

			expect(result.result).toBe('skipped');
		});

		it('should return "skipped" if counterpart token is not found', async () => {
			mockAssertSendTokenData.mockReturnValue(undefined);
			mockFindToken.mockReturnValue(undefined);

			const result = await autoLoadToken(params);

			expect(result.result).toBe('skipped');
		});

		it('should return "skipped" if counterpart token is already enabled', async () => {
			mockAssertSendTokenData.mockReturnValue(undefined);
			mockFindToken.mockReturnValue({ enabled: true });

			const result = await autoLoadToken(params);

			expect(result.result).toBe('skipped');
		});

		it('should return "error" if setToken fails and show toast error', async () => {
			const error = new Error('Set token failed');

			mockAssertSendTokenData.mockReturnValue(undefined);
			mockFindToken.mockReturnValue({ enabled: false });
			mockSetToken.mockRejectedValue(error);

			const { result } = await autoLoadToken(params);

			expect(result).toBe('error');

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: mockErrorMessage },
				err: error
			});

			expect(spyBusyStart).toHaveBeenCalledOnce();
			expect(spyBusyStop).toHaveBeenCalledOnce();
		});

		it('should enable counterpart token, reload tokens, and return "loaded" on success', async () => {
			const pseudoDisabledToken = { enabled: false };

			mockAssertSendTokenData.mockReturnValue(undefined);
			mockFindToken.mockReturnValue(pseudoDisabledToken);
			mockSetToken.mockResolvedValue(undefined);
			mockLoadTokens.mockResolvedValue(undefined);

			const { result } = await autoLoadToken(params);

			expect(result).toBe('loaded');

			expect(mockSetToken).toHaveBeenCalledWith({
				identity: mockIdentity,
				token: pseudoDisabledToken,
				enabled: true
			});
			expect(mockLoadTokens).toHaveBeenCalledWith({ identity: mockIdentity });

			expect(spyBusyStart).toHaveBeenCalledOnce();
			expect(spyBusyStop).toHaveBeenCalledOnce();
		});
	});
});
