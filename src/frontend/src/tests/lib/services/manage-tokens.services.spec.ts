import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { nullishSignOut } from '$lib/services/auth.services';
import { saveTokens } from '$lib/services/manage-tokens.services';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('manage-tokens.services', () => {
	describe('saveTokens', () => {
		const mockProgress = vi.fn();
		const mockModalNext = vi.fn();
		const mockOnSuccess = vi.fn();
		const mockOnError = vi.fn();
		const mockSave = vi.fn();

		const tokens = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN, SOLANA_TOKEN];

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
		});
	});
});
