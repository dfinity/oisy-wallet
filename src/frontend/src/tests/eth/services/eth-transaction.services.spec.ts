import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import * as nativeTokensDerived from '$eth/derived/native-tokens.derived';
import * as ethBalanceServices from '$eth/services/eth-balance.services';
import { processErc20Transaction } from '$eth/services/eth-transaction.services';
import * as ethTransactionsServices from '$eth/services/eth-transactions.services';
import type { RequiredToken } from '$lib/types/token';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { readable } from 'svelte/store';

describe('eth-transaction.services', () => {
	describe('processErc20Transaction', () => {
		const hash = '0x5f97b634e4173d1b167c23386b677976a8d807b91eefe9e407b0025cff4fe441';

		const mockNativeTokens = (tokens: RequiredToken[]) =>
			vi
				.spyOn(nativeTokensDerived, 'enabledEthEvmNativeTokens', 'get')
				.mockReturnValue(readable(tokens));

		const processMined = (token: Parameters<typeof processErc20Transaction>[0]['token']) =>
			processErc20Transaction({
				identity: mockIdentity,
				hash,
				value: 1n,
				token,
				type: 'mined'
			});

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(ethTransactionsServices, 'reloadEthereumTransactions').mockResolvedValue({
				success: true
			});
			vi.spyOn(ethBalanceServices, 'reloadEthereumBalance').mockResolvedValue({ success: true });

			mockNativeTokens([ETHEREUM_TOKEN as RequiredToken]);
		});

		it('reloads the native balance too, since the mined transfer paid its gas out of it', async () => {
			await processMined(mockValidErc20Token);

			expect(ethBalanceServices.reloadEthereumBalance).toHaveBeenCalledTimes(2);

			expect(ethBalanceServices.reloadEthereumBalance).toHaveBeenCalledWith(mockValidErc20Token);

			expect(ethBalanceServices.reloadEthereumBalance).toHaveBeenCalledWith(ETHEREUM_TOKEN);
		});

		it('reloads the balance once when the token that was sent is the native one', async () => {
			await processMined(ETHEREUM_TOKEN);

			expect(ethBalanceServices.reloadEthereumBalance).toHaveBeenCalledExactlyOnceWith(
				ETHEREUM_TOKEN
			);
		});

		it('reloads only the token that was sent when no native token matches its network', async () => {
			mockNativeTokens([SEPOLIA_TOKEN as RequiredToken]);

			await processMined(mockValidErc20Token);

			expect(ethBalanceServices.reloadEthereumBalance).toHaveBeenCalledExactlyOnceWith(
				mockValidErc20Token
			);
		});

		it('reloads the transactions of the token that was sent', async () => {
			await processMined(mockValidErc20Token);

			expect(ethTransactionsServices.reloadEthereumTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokenId: mockValidErc20Token.id,
				networkId: ETHEREUM_NETWORK.id,
				chainId: ETHEREUM_NETWORK.chainId,
				standard: mockValidErc20Token.standard
			});
		});
	});
});
