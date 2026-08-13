import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
import { ERC20_FALLBACK_FEE } from '$eth/constants/erc20.constants';
import { ETH_FEE_RETRY_MAX_ATTEMPTS } from '$eth/constants/eth.constants';
import * as infuraMod from '$eth/providers/infura.providers';
import { InfuraGasRest } from '$eth/rest/infura.rest';
import * as approveServices from '$eth/services/approve.services';
import * as erc4626Services from '$eth/services/erc4626.services';
import * as listenerServices from '$eth/services/eth-listener.services';
import * as feeServices from '$eth/services/fee.services';
import * as nftTransfer from '$eth/services/nft-transfer.services';
import {
	ETH_FEE_CONTEXT_KEY,
	type EthFeeStore,
	type FeeStoreData
} from '$eth/stores/eth-fee.store';
import type { Erc4626ContractAddress } from '$eth/types/erc4626';
import type { GetFeeData } from '$eth/types/infura';
import type { EthereumNetwork } from '$eth/types/network';
import * as ethUtils from '$eth/utils/eth.utils';
import * as tokenUtils from '$eth/utils/token.utils';
import * as evmNativeUtils from '$evm/utils/native-token.utils';
import * as ckethStoreMod from '$icp-eth/stores/cketh.store';
import { ZERO } from '$lib/constants/app.constants';
import * as addressDerived from '$lib/derived/address.derived';
import * as toastsStore from '$lib/stores/toasts.store';
import type { Network } from '$lib/types/network';
import type { Nft } from '$lib/types/nft';
import type { OptionAmount } from '$lib/types/send';
import type { Token, TokenId } from '$lib/types/token';
import * as networkUtils from '$lib/utils/network.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';
import type { Snippet } from 'svelte';
import { readable, writable, type Writable } from 'svelte/store';

vi.mock('$eth/rest/infura.rest', () => ({
	InfuraGasRest: vi.fn()
}));

describe('EthFeeContext', () => {
	const feeState: Writable<FeeStoreData | undefined> = writable(undefined);
	const setFeeMock = vi.fn((v: FeeStoreData) => feeState.set(v));
	const feeStore: EthFeeStore = {
		subscribe: feeState.subscribe,
		setFee: setFeeMock
	};

	const mockContext = (fs: EthFeeStore) => new Map([[ETH_FEE_CONTEXT_KEY, { feeStore: fs }]]);

	const network = ETHEREUM_NETWORK;

	const nativeEthereumToken = ETHEREUM_TOKEN;

	const destination = '0x1111111111111111111111111111111111111111';
	const fromAddr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

	const baseProps: {
		observe: boolean;
		destination: string;
		amount: OptionAmount;
		data: string | undefined;
		erc4626ContractAddress: Erc4626ContractAddress | undefined;
		erc4626Operation: 'deposit' | 'withdraw' | 'redeem' | undefined;
		erc4626Shares?: bigint | undefined;
		maxAmount: bigint | undefined;
		sourceNetwork: EthereumNetwork;
		targetNetwork: Network | undefined;
		nativeEthereumToken: Token;
		sendToken: Token;
		sendTokenId: TokenId;
		sendNft: Nft | undefined;
		children: Snippet;
	} = {
		observe: true,
		destination,
		amount: 1,
		data: undefined,
		erc4626ContractAddress: undefined,
		erc4626Operation: undefined,
		erc4626Shares: undefined,
		maxAmount: undefined,
		sourceNetwork: network,
		targetNetwork: network,
		nativeEthereumToken,
		sendToken: ETHEREUM_TOKEN,
		sendTokenId: ETHEREUM_TOKEN.id,
		sendNft: undefined,
		children: mockSnippet
	};

	const renderWith = (props: Partial<typeof baseProps> = {}) =>
		render(EthFeeContext, { props: { ...baseProps, ...props }, context: mockContext(feeStore) });

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		InfuraGasRest.prototype.getSuggestedFeeData = vi.fn().mockResolvedValue({
			maxFeePerGas: 12n,
			maxPriorityFeePerGas: 7n
		});

		vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable(fromAddr));
		vi.spyOn(networkUtils, 'isNetworkICP').mockReturnValue(false);
		vi.spyOn(listenerServices, 'initMinedTransactionsListener').mockReturnValue({
			disconnect: vi.fn()
		});

		vi.spyOn(ethUtils, 'isSupportedEthTokenId').mockReturnValue(false);
		vi.spyOn(evmNativeUtils, 'isSupportedEvmNativeTokenId').mockReturnValue(false);
		vi.spyOn(tokenUtils, 'isSupportedErc20TwinTokenId').mockReturnValue(false);

		vi.spyOn(ckethStoreMod, 'ckEthMinterInfoStore', 'get').mockReturnValue({
			...writable({}),
			batchSet: vi.fn(),
			reset: vi.fn(),
			reinitialize: vi.fn()
		});

		vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
			getFeeData: async () =>
				await new Promise((resolve) =>
					resolve({
						gasPrice: null,
						maxFeePerGas: 10n,
						maxPriorityFeePerGas: 5n
					})
				),
			safeEstimateGas: async () => await new Promise((resolve) => resolve(ZERO)),
			estimateGas: async () => await new Promise((resolve) => resolve(ZERO))
		} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

		vi.spyOn(feeServices, 'getEthFeeData').mockReturnValue(21n);
		vi.spyOn(feeServices, 'getCkErc20FeeData').mockResolvedValue(ZERO);
		vi.spyOn(feeServices, 'getErc20FeeData').mockResolvedValue(ZERO);

		vi.spyOn(nftTransfer, 'encodeErc721SafeTransfer').mockReturnValue({
			to: '0x2222222222222222222222222222222222222222',
			data: '0xdeadbeef'
		});
		vi.spyOn(nftTransfer, 'encodeErc1155SafeTransfer').mockReturnValue({
			to: '0x3333333333333333333333333333333333333333',
			data: '0xfeedbead'
		});

		vi.spyOn(approveServices, 'encodeErc20Approve').mockReturnValue({
			to: '0x4444444444444444444444444444444444444444',
			data: '0xapprovedata'
		});
		vi.spyOn(erc4626Services, 'encodeErc4626Withdraw').mockReturnValue({
			to: '0x5555555555555555555555555555555555555555',
			data: '0xwithdrawdata'
		});
		vi.spyOn(erc4626Services, 'encodeErc4626Redeem').mockReturnValue({
			to: '0x5555555555555555555555555555555555555555',
			data: '0xredeemdata'
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should set fee for native ETH / EVM-native tokens using max(safeEstimateGas, getEthFeeData)', async () => {
		vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

		const provider = infuraMod.infuraProviders(network.id) as unknown as {
			getFeeData: () => Promise<unknown>;
			safeEstimateGas: (p: GetFeeData) => Promise<bigint>;
		};
		vi.spyOn(provider, 'safeEstimateGas').mockResolvedValue(25n);

		renderWith();

		await vi.runAllTimersAsync();

		expect(feeStore.setFee).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				gas: 25n,
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			})
		);
	});

	it('should set fee for ckERC20 twin using getCkErc20FeeData', async () => {
		vi.mocked(tokenUtils.isSupportedErc20TwinTokenId).mockReturnValue(true);
		vi.mocked(feeServices.getCkErc20FeeData).mockResolvedValue(123n);

		renderWith();

		await vi.runAllTimersAsync();

		expect(feeStore.setFee).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				gas: 123n
			})
		);
	});

	it('should set fee for NFT (ERC-721) by encoding and estimating gas', async () => {
		vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(false);
		vi.mocked(evmNativeUtils.isSupportedEvmNativeTokenId).mockReturnValue(false);
		vi.mocked(tokenUtils.isSupportedErc20TwinTokenId).mockReturnValue(false);

		const nft = mockValidErc721Nft;

		const provider = infuraMod.infuraProviders(network.id) as unknown as {
			estimateGas: (p: GetFeeData & { data?: string }) => Promise<bigint>;
		};
		vi.spyOn(provider, 'estimateGas').mockResolvedValue(90n);

		renderWith({
			sendToken: mockValidErc721Token,
			sendTokenId: mockValidErc721Token.id,
			sendNft: nft
		});

		await vi.runAllTimersAsync();

		expect(nftTransfer.encodeErc721SafeTransfer).toHaveBeenCalledExactlyOnceWith({
			contractAddress: nft.collection.address,
			from: fromAddr,
			to: destination,
			tokenId: nft.id
		});

		expect(provider.estimateGas).toHaveBeenCalledExactlyOnceWith({
			from: fromAddr,
			to: '0x2222222222222222222222222222222222222222',
			data: '0xdeadbeef'
		});

		expect(feeStore.setFee).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				gas: 90n
			})
		);
	});

	describe('erc4626 fee estimation', () => {
		const erc4626ContractAddress =
			'0x6666666666666666666666666666666666666666' as Erc4626ContractAddress;

		it('should estimate deposit fee as approveGas + fallback', async () => {
			const provider = infuraMod.infuraProviders(network.id) as unknown as {
				safeEstimateGas: (p: unknown) => Promise<bigint | undefined>;
			};
			vi.spyOn(provider, 'safeEstimateGas').mockResolvedValue(100n);

			renderWith({
				sendToken: mockValidErc20Token,
				sendTokenId: mockValidErc20Token.id,
				erc4626ContractAddress,
				erc4626Operation: 'deposit'
			});

			await vi.runAllTimersAsync();

			expect(approveServices.encodeErc20Approve).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					tokenAddress: mockValidErc20Token.address,
					spender: erc4626ContractAddress
				})
			);

			expect(feeStore.setFee).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					gas: 100n + ERC20_FALLBACK_FEE
				})
			);
		});

		it('should use fallback when approve gas estimation returns undefined', async () => {
			const provider = infuraMod.infuraProviders(network.id) as unknown as {
				safeEstimateGas: (p: unknown) => Promise<bigint | undefined>;
			};
			vi.spyOn(provider, 'safeEstimateGas').mockResolvedValue(undefined);

			renderWith({
				sendToken: mockValidErc20Token,
				sendTokenId: mockValidErc20Token.id,
				erc4626ContractAddress,
				erc4626Operation: 'deposit'
			});

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					gas: ERC20_FALLBACK_FEE + ERC20_FALLBACK_FEE
				})
			);
		});

		it('should estimate withdraw fee using encodeErc4626Withdraw', async () => {
			const provider = infuraMod.infuraProviders(network.id) as unknown as {
				safeEstimateGas: (p: unknown) => Promise<bigint | undefined>;
			};
			vi.spyOn(provider, 'safeEstimateGas').mockResolvedValue(200n);

			renderWith({
				sendToken: mockValidErc4626Token,
				sendTokenId: mockValidErc4626Token.id,
				erc4626ContractAddress,
				erc4626Operation: 'withdraw'
			});

			await vi.runAllTimersAsync();

			expect(erc4626Services.encodeErc4626Withdraw).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					contractAddress: erc4626ContractAddress,
					receiver: fromAddr,
					owner: fromAddr
				})
			);

			expect(feeStore.setFee).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					gas: 200n
				})
			);
		});

		it('should use fallback fee when withdraw gas estimation returns undefined', async () => {
			const provider = infuraMod.infuraProviders(network.id) as unknown as {
				safeEstimateGas: (p: unknown) => Promise<bigint | undefined>;
			};
			vi.spyOn(provider, 'safeEstimateGas').mockResolvedValue(undefined);

			renderWith({
				sendToken: mockValidErc4626Token,
				sendTokenId: mockValidErc4626Token.id,
				erc4626ContractAddress,
				erc4626Operation: 'withdraw'
			});

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					gas: ERC20_FALLBACK_FEE
				})
			);
		});

		it('should cap withdraw amount to maxAmount when parsedAmount exceeds it', async () => {
			const provider = infuraMod.infuraProviders(network.id) as unknown as {
				safeEstimateGas: (p: unknown) => Promise<bigint | undefined>;
			};
			vi.spyOn(provider, 'safeEstimateGas').mockResolvedValue(300n);

			renderWith({
				sendToken: mockValidErc4626Token,
				sendTokenId: mockValidErc4626Token.id,
				erc4626ContractAddress,
				erc4626Operation: 'withdraw',
				amount: 999_999,
				maxAmount: 50n
			});

			await vi.runAllTimersAsync();

			expect(erc4626Services.encodeErc4626Withdraw).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					assets: 50n
				})
			);
		});

		it('should estimate redeem fee using encodeErc4626Redeem with shares', async () => {
			const provider = infuraMod.infuraProviders(network.id) as unknown as {
				safeEstimateGas: (p: unknown) => Promise<bigint | undefined>;
			};
			vi.spyOn(provider, 'safeEstimateGas').mockResolvedValue(250n);

			const mockShares = 1_000_000n;

			renderWith({
				sendToken: mockValidErc4626Token,
				sendTokenId: mockValidErc4626Token.id,
				erc4626ContractAddress,
				erc4626Operation: 'redeem',
				erc4626Shares: mockShares
			});

			await vi.runAllTimersAsync();

			expect(erc4626Services.encodeErc4626Redeem).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					contractAddress: erc4626ContractAddress,
					shares: mockShares,
					receiver: fromAddr,
					owner: fromAddr
				})
			);

			expect(feeStore.setFee).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					gas: 250n
				})
			);
		});

		it('should use fallback fee when redeem gas estimation returns undefined', async () => {
			const provider = infuraMod.infuraProviders(network.id) as unknown as {
				safeEstimateGas: (p: unknown) => Promise<bigint | undefined>;
			};
			vi.spyOn(provider, 'safeEstimateGas').mockResolvedValue(undefined);

			renderWith({
				sendToken: mockValidErc4626Token,
				sendTokenId: mockValidErc4626Token.id,
				erc4626ContractAddress,
				erc4626Operation: 'redeem',
				erc4626Shares: 500_000n
			});

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					gas: ERC20_FALLBACK_FEE
				})
			);
		});
	});

	it('should do nothing when no eth address is available', async () => {
		vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable(undefined));

		renderWith();

		await vi.runAllTimersAsync();

		expect(feeStore.setFee).not.toHaveBeenCalled();
	});

	describe('safety after unmount', () => {
		it('should not fetch fee data when debounced call fires after component is destroyed', async () => {
			vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

			const { unmount } = renderWith();

			unmount();

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).not.toHaveBeenCalled();
		});

		it('should not schedule new fee fetches after component is destroyed', async () => {
			vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

			const { unmount } = renderWith();

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).toHaveBeenCalledOnce();

			setFeeMock.mockClear();

			unmount();

			await vi.advanceTimersByTimeAsync(15_000);

			expect(feeStore.setFee).not.toHaveBeenCalled();
		});

		it('should not throw or show error toast when sendToken is nullish', async () => {
			const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

			renderWith({ sendToken: undefined as unknown as Token });

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).not.toHaveBeenCalled();
			expect(toastsErrorSpy).not.toHaveBeenCalled();
		});

		it('should not show "cannot fetch gas fee" toast after unmount', async () => {
			const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');

			vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

			const { unmount } = renderWith();

			unmount();

			await vi.runAllTimersAsync();

			expect(toastsErrorSpy).not.toHaveBeenCalled();
		});
	});

	describe('fee recovery (foreground refetch + retry)', () => {
		const mockFailingThenRecovering = () => {
			const getFeeData = vi
				.fn()
				.mockRejectedValueOnce(new Error('network down'))
				.mockResolvedValue({ gasPrice: null, maxFeePerGas: 10n, maxPriorityFeePerGas: 5n });

			vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
				getFeeData,
				safeEstimateGas: async () => await Promise.resolve(ZERO),
				estimateGas: async () => await Promise.resolve(ZERO)
			} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

			return getFeeData;
		};

		it('should re-fetch the fee and reconnect the listener when returning to the foreground', async () => {
			vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

			const initListenerSpy = vi.mocked(listenerServices.initMinedTransactionsListener);

			renderWith();

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).toHaveBeenCalledOnce();

			setFeeMock.mockClear();
			initListenerSpy.mockClear();

			document.dispatchEvent(new Event('visibilitychange'));

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).toHaveBeenCalledOnce();
			expect(initListenerSpy).toHaveBeenCalledOnce();
		});

		it('should not re-fetch on foreground when not observing', async () => {
			vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

			renderWith({ observe: false });

			await vi.runAllTimersAsync();

			setFeeMock.mockClear();

			document.dispatchEvent(new Event('visibilitychange'));

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).not.toHaveBeenCalled();
		});

		it('should not re-fetch on visibility change while the tab is hidden', async () => {
			vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

			renderWith();

			await vi.runAllTimersAsync();

			setFeeMock.mockClear();

			Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });

			document.dispatchEvent(new Event('visibilitychange'));

			await vi.runAllTimersAsync();

			expect(feeStore.setFee).not.toHaveBeenCalled();

			delete (document as unknown as { hidden?: boolean }).hidden;
		});

		it('should retry a failed fee fetch and self-heal once the network recovers', async () => {
			vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

			const toastsErrorSpy = vi.spyOn(toastsStore, 'toastsError');
			const getFeeData = mockFailingThenRecovering();

			renderWith();

			await vi.runAllTimersAsync();

			// One failed attempt (error toast, no fee) followed by a successful retry.
			expect(getFeeData).toHaveBeenCalledTimes(2);
			expect(toastsErrorSpy).toHaveBeenCalledOnce();
			expect(feeStore.setFee).toHaveBeenCalledOnce();
		});

		it('should stop retrying after the maximum number of attempts', async () => {
			vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

			const getFeeData = vi.fn().mockRejectedValue(new Error('still down'));
			vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
				getFeeData,
				safeEstimateGas: async () => await Promise.resolve(ZERO),
				estimateGas: async () => await Promise.resolve(ZERO)
			} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

			renderWith();

			await vi.runAllTimersAsync();

			// Initial attempt + a bounded number of retries, then it gives up.
			expect(getFeeData).toHaveBeenCalledTimes(ETH_FEE_RETRY_MAX_ATTEMPTS + 1);
			expect(feeStore.setFee).not.toHaveBeenCalled();
		});

		it('should not retry after the component is destroyed', async () => {
			vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

			const getFeeData = vi.fn().mockRejectedValue(new Error('down'));
			vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
				getFeeData,
				safeEstimateGas: async () => await Promise.resolve(ZERO),
				estimateGas: async () => await Promise.resolve(ZERO)
			} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

			const { unmount } = renderWith();

			// Let the initial attempt fail and schedule a retry.
			await vi.advanceTimersByTimeAsync(1_000);

			const callsBeforeUnmount = getFeeData.mock.calls.length;

			unmount();

			await vi.advanceTimersByTimeAsync(60_000);

			expect(getFeeData).toHaveBeenCalledTimes(callsBeforeUnmount);
		});
	});
});
