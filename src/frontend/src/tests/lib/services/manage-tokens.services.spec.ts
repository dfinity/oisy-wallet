import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
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
} from '$lib/constants/analytics.constants';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { trackEvent } from '$lib/services/analytics.services';
import { saveTokens } from '$lib/services/manage-tokens.services';
import { trackTokenManage } from '$lib/services/token-manage-analytics.services';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError, toastsShow } from '$lib/stores/toasts.store';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

vi.mock('$lib/services/token-manage-analytics.services', () => ({
	trackTokenManage: vi.fn()
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
			vi.spyOn(toastsStore, 'toastsShow');
		});

		it('should return early if identity is nullish', async () => {
			await saveTokens({ ...params, identity: null });

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
						tokenName: token.name,
						tokenStandard: token.standard.code,
						networkId: token.network?.id.description,
						source: MANAGE_TOKENS_MODAL_ROUTE
					}
				});

				expect(trackTokenManage).toHaveBeenNthCalledWith(index + 1, {
					modifier: token.enabled ? 'enable' : 'disable',
					token: {
						network: token.network.id.description,
						address:
							'address' in token
								? token.address
								: 'ledgerCanisterId' in token
									? token.ledgerCanisterId
									: token.id.description,
						standard: token.standard.code,
						symbol: token.symbol,
						name: token.name
					},
					sourceLocation: 'manage_tokens',
					resultStatus: 'success'
				});
			});
		});

		it('should derive token_manage network fields for backend custom-token variants', async () => {
			const customTokens: SaveCustomTokenWithKey[] = [
				{
					enabled: true,
					networkKey: 'Icrc7',
					canisterId: mockIcrc7CanisterId
				},
				{
					enabled: false,
					networkKey: 'Erc20',
					address: mockEthAddress,
					chainId: ETHEREUM_NETWORK.chainId
				}
			];

			mockSave.mockResolvedValueOnce(undefined);

			await saveTokens({ ...params, tokens: customTokens });

			expect(trackTokenManage).toHaveBeenNthCalledWith(1, {
				modifier: 'enable',
				token: {
					network: ICP_NETWORK_ID.description,
					address: mockIcrc7CanisterId
				},
				sourceLocation: 'manage_tokens',
				resultStatus: 'success'
			});
			expect(trackTokenManage).toHaveBeenNthCalledWith(2, {
				modifier: 'disable',
				token: {
					network: ETHEREUM_NETWORK.id.description,
					address: mockEthAddress
				},
				sourceLocation: 'manage_tokens',
				resultStatus: 'success'
			});
		});

		it('should support token_manage import modifier override', async () => {
			const customTokens: SaveCustomTokenWithKey[] = [
				{
					enabled: true,
					networkKey: 'Icrc7',
					canisterId: mockIcrc7CanisterId
				}
			];

			mockSave.mockResolvedValueOnce(undefined);

			await saveTokens({ ...params, tokens: customTokens, tokenManageModifier: 'import' });

			expect(trackTokenManage).toHaveBeenCalledExactlyOnceWith({
				modifier: 'import',
				token: {
					network: ICP_NETWORK_ID.description,
					address: mockIcrc7CanisterId
				},
				sourceLocation: 'manage_tokens',
				resultStatus: 'success'
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
			expect(toastsShow).not.toHaveBeenCalled();
			expect(mockOnError).toHaveBeenCalledOnce();

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_MANAGE_TOKENS_SAVE_ERROR,
				metadata: {
					error: 'Save failed'
				}
			});

			expect(trackTokenManage).toHaveBeenCalledTimes(tokens.length);

			tokens.forEach((token, index) => {
				expect(trackTokenManage).toHaveBeenNthCalledWith(index + 1, {
					modifier: token.enabled ? 'enable' : 'disable',
					token: {
						network: token.network.id.description,
						address:
							'address' in token
								? token.address
								: 'ledgerCanisterId' in token
									? token.ledgerCanisterId
									: token.id.description,
						standard: token.standard.code,
						symbol: token.symbol,
						name: token.name
					},
					sourceLocation: 'manage_tokens',
					resultStatus: 'error',
					error: 'Save failed'
				});
			});
		});

		it('should show a warning toast on version mismatch error', async () => {
			mockSave.mockRejectedValueOnce(new Error('Version mismatch, token update not allowed'));

			await saveTokens(params);

			expect(toastsError).not.toHaveBeenCalled();
			expect(toastsShow).toHaveBeenCalledWith({
				text: en.tokens.error.version_mismatch,
				level: 'warn'
			});
			expect(mockOnError).toHaveBeenCalledOnce();

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_MANAGE_TOKENS_SAVE_ERROR,
				metadata: {
					error: 'Version mismatch, token update not allowed'
				}
			});

			expect(trackTokenManage).toHaveBeenCalledTimes(tokens.length);

			tokens.forEach((token, index) => {
				expect(trackTokenManage).toHaveBeenNthCalledWith(index + 1, {
					modifier: token.enabled ? 'enable' : 'disable',
					token: {
						network: token.network.id.description,
						address:
							'address' in token
								? token.address
								: 'ledgerCanisterId' in token
									? token.ledgerCanisterId
									: token.id.description,
						standard: token.standard.code,
						symbol: token.symbol,
						name: token.name
					},
					sourceLocation: 'manage_tokens',
					resultStatus: 'error',
					error: 'Version mismatch, token update not allowed',
					errorCode: 'version_mismatch'
				});
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
