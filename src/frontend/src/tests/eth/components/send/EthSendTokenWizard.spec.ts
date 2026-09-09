import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
import * as ethBalanceServices from '$eth/services/eth-balance.services';
import * as feeServices from '$eth/services/fee.services';
import * as nftSendServices from '$eth/services/nft-send.services';
import * as sendServices from '$eth/services/send.services';
import * as feeStoreMod from '$eth/stores/eth-fee.store';
import {
	ETH_FEE_CONTEXT_KEY,
	type EthFeeStore,
	type FeeStoreData
} from '$eth/stores/eth-fee.store';
import * as tokenUtils from '$eth/utils/token.utils';
import * as ckethServices from '$icp-eth/services/cketh.services';
import { MAX_BUTTON, REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
import * as addrDerived from '$lib/derived/address.derived';
import * as idDerived from '$lib/derived/auth.derived';
import * as exchDerived from '$lib/derived/exchange.derived';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import { initSendContext, SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import * as toasts from '$lib/stores/toasts.store';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import type { WizardStep } from '$lib/types/wizard';
import * as inputUtils from '$lib/utils/input.utils';
import EthSendTokenWizardTestHost from '$tests/eth/components/send/EthSendTokenWizardTestHost.svelte';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { fireEvent, render } from '@testing-library/svelte';
import type { TransactionResponse } from 'ethers/providers';
import { readable, writable, type Writable } from 'svelte/store';

vi.mock('$eth/providers/alchemy.providers', () => ({
	initMinedTransactionsListener: () => ({
		disconnect: async () => {}
	})
}));

describe('EthSendTokenWizard.spec', () => {
	const fromAddr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
	const destination = '0x1111111111111111111111111111111111111111';

	let feeState: Writable<FeeStoreData>;
	let feeStore: EthFeeStore;

	const mockSendContext = ({
		sendToken,
		sendTokenDecimals
	}: {
		sendToken: Token | NonFungibleToken;
		sendTokenDecimals: number;
	}) => ({
		sendToken: writable(sendToken),
		sendTokenId: writable(sendToken.id),
		sendTokenDecimals: writable(sendTokenDecimals),
		sendEthCustomNonce: writable(undefined)
	});

	const mockContext = (params: {
		sendToken: Token | NonFungibleToken;
		sendTokenDecimals: number;
	}): Map<unknown, unknown> =>
		new Map<unknown, unknown>([
			[ETH_FEE_CONTEXT_KEY, { feeStore }],
			[SEND_CONTEXT_KEY, mockSendContext(params)]
		]);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(fromAddr));
		vi.spyOn(idDerived, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
		vi.spyOn(exchDerived, 'exchanges', 'get').mockReturnValue(readable({}));
		vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));
		vi.spyOn(inputUtils, 'invalidAmount').mockReturnValue(false);
		vi.spyOn(ckethServices, 'assertCkEthMinterInfoLoaded').mockReturnValue({ valid: true });
		vi.spyOn(tokenUtils, 'isErc20Icp').mockReturnValue(false);

		feeState = writable({
			gas: 100n,
			maxFeePerGas: 2_000_000n,
			maxPriorityFeePerGas: 1_000_000n
		});
		feeStore = {
			subscribe: feeState.subscribe,
			setFee: vi.fn((partial) => {
				feeState.update((cur) => ({ ...cur, ...partial }));
			})
		};
		vi.spyOn(feeStoreMod, 'initEthFeeStore').mockReturnValue(feeStore);
		vi.spyOn(feeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
			...ctx,
			maxGasFee: readable(undefined),
			minGasFee: readable(undefined),
			estimatedGasFee: readable(undefined),
			feePrioritiesStore: writable(undefined)
		}));

		vi.spyOn(sendServices, 'send').mockResolvedValue({} as TransactionResponse);
		vi.spyOn(nftSendServices, 'sendNft').mockResolvedValue(undefined);
	});

	const renderHost = ({
		currentStep,
		sendProgressStep,
		nft,
		destination,
		sourceNetwork,
		amount,
		nativeEthereumToken,
		sendToken,
		sendTokenDecimals
	}: {
		currentStep: WizardStep;
		sendProgressStep: string;
		nft?: Nft;
		destination: string;
		sourceNetwork: typeof ETHEREUM_NETWORK;
		amount?: number | string;
		nativeEthereumToken: Token;
		sendToken: Token | NonFungibleToken;
		sendTokenDecimals: number;
	}) =>
		render(EthSendTokenWizard, {
			props: {
				currentStep,
				sendProgressStep,
				nft,
				destination,
				sourceNetwork,
				amount: amount ?? 1,
				nativeEthereumToken,
				onBack: vi.fn(),
				onClose: vi.fn(),
				onNext: vi.fn(),
				onSendBack: vi.fn(),
				onTokensList: vi.fn()
			},
			context: mockContext({ sendToken, sendTokenDecimals })
		});

	it('sends token via executeSend on icSend', async () => {
		const { getByTestId } = renderHost({
			currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
			sendProgressStep: ProgressStepsSend.INITIALIZATION,
			nft: undefined,
			destination,
			sourceNetwork: ETHEREUM_NETWORK,
			nativeEthereumToken: ETHEREUM_TOKEN,
			sendToken: ETHEREUM_TOKEN,
			sendTokenDecimals: ETHEREUM_TOKEN.decimals
		});

		await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));
		await vi.runOnlyPendingTimersAsync();

		expect(sendServices.send).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				from: fromAddr,
				to: destination,
				token: ETHEREUM_TOKEN,
				sourceNetwork: ETHEREUM_NETWORK,
				gas: 100n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			})
		);

		expect(nftSendServices.sendNft).not.toHaveBeenCalled();
	});

	it('sends NFT via sendNft on icSend', async () => {
		const nft: Nft = mockValidErc721Nft;
		const collectionToken: NonFungibleToken = mockValidErc721Token;

		const { getByTestId } = renderHost({
			currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
			sendProgressStep: ProgressStepsSend.INITIALIZATION,
			nft,
			destination,
			sourceNetwork: ETHEREUM_NETWORK,
			nativeEthereumToken: ETHEREUM_TOKEN,
			sendToken: collectionToken,
			sendTokenDecimals: 0
		});

		await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));
		await vi.runOnlyPendingTimersAsync();

		expect(nftSendServices.sendNft).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				token: collectionToken,
				tokenId: nft.id,
				to: destination,
				from: fromAddr,
				gas: 100n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			})
		);

		expect(sendServices.send).not.toHaveBeenCalled();
	});

	it('marks NFT send progress as done before closing', async () => {
		const nft: Nft = mockValidErc721Nft;
		const collectionToken: NonFungibleToken = mockValidErc721Token;
		const onCloseStep = vi.fn();

		vi.mocked(nftSendServices.sendNft).mockImplementationOnce(({ progress }) => {
			progress?.(ProgressStepsSend.SIGN_TRANSFER);
			progress?.(ProgressStepsSend.TRANSFER);

			return Promise.resolve();
		});

		const { getByTestId } = render(EthSendTokenWizardTestHost, {
			props: {
				currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
				destination,
				sendContext: mockSendContext({
					sendToken: collectionToken,
					sendTokenDecimals: 0
				}),
				sourceNetwork: ETHEREUM_NETWORK,
				nativeEthereumToken: ETHEREUM_TOKEN,
				nft,
				onCloseStep
			}
		});

		await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));

		expect(onCloseStep).not.toHaveBeenCalled();

		await vi.runOnlyPendingTimersAsync();

		expect(onCloseStep).toHaveBeenCalledExactlyOnceWith(ProgressStepsSend.DONE);
	});

	describe('fee observation', () => {
		// The amount step needs the whole send context (balance, exchange rate, priority), so the
		// real one stands in for the minimal mock the send assertions above get by with.
		const renderStep = (name: WizardStepsSend) =>
			render(EthSendTokenWizard, {
				props: {
					currentStep: { name, title: name },
					sendProgressStep: ProgressStepsSend.INITIALIZATION,
					destination,
					sourceNetwork: ETHEREUM_NETWORK,
					amount: 1,
					nativeEthereumToken: ETHEREUM_TOKEN,
					onBack: vi.fn(),
					onClose: vi.fn(),
					onNext: vi.fn(),
					onSendBack: vi.fn(),
					onTokensList: vi.fn()
				},
				context: new Map<unknown, unknown>([
					[ETH_FEE_CONTEXT_KEY, { feeStore }],
					[SEND_CONTEXT_KEY, initSendContext({ token: ETHEREUM_TOKEN })]
				])
			});

		beforeEach(() => {
			vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockRejectedValue(new Error('offline'));
		});

		it('keeps fetching the fee on the amount step', async () => {
			renderStep(WizardStepsSend.SEND);

			await vi.runOnlyPendingTimersAsync();

			expect(feeServices.getEthFeeDataWithProvider).toHaveBeenCalled();
		});

		it('freezes the fee on the review step', async () => {
			renderStep(WizardStepsSend.REVIEW);

			await vi.runOnlyPendingTimersAsync();

			// The amount shown for review was priced against the fee in hand; a fresh sample would
			// move the fee underneath it, and a spike right before "Send" would be signed as is.
			expect(feeServices.getEthFeeDataWithProvider).not.toHaveBeenCalled();
		});
	});

	describe('max send', () => {
		// The fee the amount is capped against, as the frozen `feeState` above prices it:
		// `maxFeePerGas * gas`, with no L1 data fee on Ethereum.
		const gasFee = 2_000_000n * 100n;
		// What the poll last saw, and what "Max" therefore offers.
		const staleBalance = 1_000_000_000_000_000_000n;
		// What the account holds by the time the transaction is signed, the difference being gas
		// already spent by a transfer the poll has not caught up with.
		const freshBalance = staleBalance - 500_000_000n;

		const renderMaxSend = () => {
			balancesStore.set({
				id: ETHEREUM_TOKEN.id,
				data: { data: staleBalance, certified: false }
			});

			return render(EthSendTokenWizardTestHost, {
				props: {
					currentStep: { name: WizardStepsSend.SEND, title: WizardStepsSend.SEND },
					destination,
					sendContext: initSendContext({ token: ETHEREUM_TOKEN }),
					sourceNetwork: ETHEREUM_NETWORK,
					nativeEthereumToken: ETHEREUM_TOKEN,
					onCloseStep: vi.fn()
				}
			});
		};

		beforeEach(() => {
			vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockRejectedValue(new Error('offline'));

			vi.spyOn(feeStoreMod, 'initEthFeeContext').mockImplementation((ctx) => ({
				...ctx,
				maxGasFee: readable(gasFee),
				minGasFee: readable(gasFee),
				estimatedGasFee: readable(gasFee),
				feePrioritiesStore: writable(undefined)
			}));

			vi.spyOn(ethBalanceServices, 'reloadEthereumBalance').mockImplementation(() => {
				balancesStore.set({
					id: ETHEREUM_TOKEN.id,
					data: { data: freshBalance, certified: false }
				});

				return Promise.resolve({ success: true });
			});
		});

		afterEach(() => {
			balancesStore.reset(ETHEREUM_TOKEN.id);
		});

		it('signs a Max amount that fits the balance as it is at signing time', async () => {
			const { getByTestId, rerender } = renderMaxSend();

			await fireEvent.click(getByTestId(MAX_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			await rerender({
				currentStep: { name: WizardStepsSend.REVIEW, title: WizardStepsSend.REVIEW }
			});

			await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			expect(ethBalanceServices.reloadEthereumBalance).toHaveBeenCalledWith(ETHEREUM_TOKEN);

			// Not `staleBalance - gasFee`: that amount plus the gas it reserves is more than the
			// account holds, and the chain refuses such a transaction outright.
			expect(sendServices.send).toHaveBeenCalledWith(
				expect.objectContaining({ amount: freshBalance - gasFee })
			);
		});

		it('still caps against the balance the amount was priced with when the re-read fails', async () => {
			// A failed re-read empties the balance in the store rather than leaving the previous one.
			vi.spyOn(ethBalanceServices, 'reloadEthereumBalance').mockImplementation(() => {
				balancesStore.reset(ETHEREUM_TOKEN.id);

				return Promise.resolve({ success: false });
			});

			const { getByTestId, rerender } = renderMaxSend();

			await fireEvent.click(getByTestId(MAX_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			await rerender({
				currentStep: { name: WizardStepsSend.REVIEW, title: WizardStepsSend.REVIEW }
			});

			await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));
			await vi.runOnlyPendingTimersAsync();

			expect(sendServices.send).toHaveBeenCalledWith(
				expect.objectContaining({ amount: staleBalance - gasFee })
			);
		});
	});

	it('shows a toast and aborts when destination is empty', async () => {
		const { getByTestId } = renderHost({
			currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
			sendProgressStep: ProgressStepsSend.INITIALIZATION,
			nft: undefined,
			destination: '',
			sourceNetwork: ETHEREUM_NETWORK,
			nativeEthereumToken: ETHEREUM_TOKEN,
			sendToken: ETHEREUM_TOKEN,
			sendTokenDecimals: ETHEREUM_TOKEN.decimals
		});

		await fireEvent.click(getByTestId(REVIEW_FORM_SEND_BUTTON));
		await vi.runOnlyPendingTimersAsync();

		expect(toasts.toastsError).toHaveBeenCalled();

		expect(sendServices.send).not.toHaveBeenCalled();

		expect(nftSendServices.sendNft).not.toHaveBeenCalled();
	});
});
