import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import {
	MANAGE_TOKENS_MODAL_ROUTE,
	TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS,
	TRACK_COUNT_MANAGE_TOKENS_ENABLE_SUCCESS,
	TRACK_COUNT_MANAGE_TOKENS_SAVE_ERROR
} from '$lib/constants/analytics.contants';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import { nullishSignOut } from '$lib/services/auth.services';
import { saveTokens } from '$lib/services/manage-tokens.services';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('manage-tokens.services', () => {
	describe('saveTokens', () => {
		const mockProgress = vi.fn();
		const mockModalNext = vi.fn();
		const mockOnSuccess = vi.fn();
		const mockOnError = vi.fn();
		const mockSave = vi.fn();

		const tokens = [
			BTC_MAINNET_TOKEN,
			ETHEREUM_TOKEN,
			ICP_TOKEN,
			SOLANA_TOKEN,
			USDC_TOKEN,
			BONK_TOKEN
		].map((token) => ({
			...token,
			enabled: Math.random() > 0.5
		}));

		const params = {
			tokens,
			save: mockSave,
			progress: mockProgress,
			modalNext: mockModalNext,
			onSuccess: mockOnSuccess,
			onError: mockOnError,
			identity: mockIdentity
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(toastsStore, 'toastsError');
		});

		it('should call nullishSignOut if identity is nullish', async () => {
			await saveTokens({ ...params, identity: null });

			expect(nullishSignOut).toHaveBeenCalledOnce();
			expect(mockSave).not.toHaveBeenCalled();
		});

		it('should show an error toast if tokens are empty', async () => {
			await saveTokens({ ...params, tokens: [] });

			expect(toastsError).toHaveBeenCalledWith({
				msg: { text: en.tokens.manage.error.empty }
			});
			expect(mockSave).not.toHaveBeenCalled();
		});

		it('should call save and handle success', async () => {
			mockSave.mockResolvedValueOnce(undefined);

			await saveTokens(params);

			expect(mockModalNext).toHaveBeenCalledOnce();
			expect(mockSave).toHaveBeenCalledWith({
				progress: mockProgress,
				identity: mockIdentity,
				tokens
			});
			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsAddToken.DONE);

			await new Promise((resolve) => setTimeout(resolve, 750));

			expect(mockOnSuccess).toHaveBeenCalledOnce();

			expect(trackEvent).toHaveBeenCalledTimes(tokens.length);

			tokens.forEach((token, index) => {
				expect(trackEvent).toHaveBeenNthCalledWith(index + 1, {
					name: token.enabled
						? TRACK_COUNT_MANAGE_TOKENS_ENABLE_SUCCESS
						: TRACK_COUNT_MANAGE_TOKENS_DISABLE_SUCCESS,
					metadata: {
						address: 'address' in token ? token.address : undefined,
						ledgerCanisterId: 'ledgerCanisterId' in token ? token.ledgerCanisterId : undefined,
						indexCanisterId: 'indexCanisterId' in token ? token.indexCanisterId : undefined,
						tokenId: token.id?.description,
						tokenSymbol: token.symbol,
						networkId: token.network?.id.description,
						source: MANAGE_TOKENS_MODAL_ROUTE
					}
				});
			});
		});

		it('should handle errors from save', async () => {
			mockSave.mockRejectedValueOnce(new Error('Save failed'));

			await saveTokens(params);

			expect(mockModalNext).toHaveBeenCalledOnce();
			expect(mockSave).toHaveBeenCalledOnce();
			expect(toastsError).toHaveBeenCalledWith({
				msg: { text: en.tokens.error.unexpected },
				err: new Error('Save failed')
			});
			expect(mockOnError).toHaveBeenCalledOnce();

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_MANAGE_TOKENS_SAVE_ERROR,
				metadata: { error: 'Save failed' }
			});
		});

		it('should map IC errors for the event tracking', async () => {
			mockSave.mockRejectedValueOnce(
				new Error(
					'AgentError: Call failed:\n' +
						'  Canister: doked-biaaa-aaaar-qag2a-cai\n' +
						'  Method: set_many_custom_tokens (update)\n' +
						'  "Request ID": "25cb1e3181d25a6e05ad2feefc2fb0c10a2e3dae56477edc23ea31eb2f367838"\n' +
						'  "Error code": "IC0503"\n' +
						'  "Reject code": "5"\n' +
						'  "Reject message": "Error from Canister doked-biaaa-aaaar-qag2a-cai: Canister called `ic0.trap` with message: \'Version mismatch, token update not allowed\'.\n' +
						'Consider gracefully handling failures from this canister or altering the canister to handle exceptions. See documentation: https://internetcomputer.org/docs/current/references/execution-errors#trapped-explicitly"\n'
				)
			);

			await saveTokens(params);

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_MANAGE_TOKENS_SAVE_ERROR,
				metadata: {
					Canister: 'doked-biaaa-aaaar-qag2a-cai',
					'Error code': 'IC0503',
					Method: 'set_many_custom_tokens (update)',
					'Reject code': '5',
					'Reject message':
						"Error from Canister doked-biaaa-aaaar-qag2a-cai: Canister called `ic0.trap` with message: 'Version mismatch, token update not allowed'."
				}
			});
		});
	});
});
