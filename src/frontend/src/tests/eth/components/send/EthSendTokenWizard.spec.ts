import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
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
import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
import * as addrDerived from '$lib/derived/address.derived';
import * as idDerived from '$lib/derived/auth.derived';
import * as exchDerived from '$lib/derived/exchange.derived';
import { ProgressStepsSend } from '$lib/enums/progress-steps';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import * as analytics from '$lib/services/analytics.services';
import { SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import * as toasts from '$lib/stores/toasts.store';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import type { WizardStep } from '$lib/types/wizard';
import * as inputUtils from '$lib/utils/input.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import EthSendTokenWizardTestHost from '$tests/eth/components/send/EthSendTokenWizardTestHost.svelte';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { fireEvent, render } from '@testing-library/svelte';
import type { TransactionResponse } from 'ethers/providers';
import { tick } from 'svelte';
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
		sendEthCustomNonce: writable(undefined),
		sendEthAmountTokenKey: writable<string | undefined>(undefined)
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

	describe('amount cached above the wizard', () => {
		// 18 decimals: a valid ETH amount, and no amount at all for a 6-decimal ERC-20.
		const cachedAmount = '0.00022959576218371';

		const erc20Token: Token = { ...mockValidErc20Token, decimals: 6 };

		const renderWizardHost = ({
			sendContext,
			destination: hostDestination = destination,
			amount = cachedAmount,
			onAmountChange
		}: {
			sendContext: ReturnType<typeof mockSendContext>;
			destination?: string;
			amount?: string;
			onAmountChange: (amount: unknown) => void;
		}) =>
			render(EthSendTokenWizardTestHost, {
				props: {
					currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
					destination: hostDestination,
					sendContext,
					sourceNetwork: ETHEREUM_NETWORK,
					nativeEthereumToken: ETHEREUM_TOKEN,
					amount,
					onCloseStep: vi.fn(),
					onAmountChange
				}
			});

		it('clears the amount when the selected token changes', async () => {
			const sendContext = mockSendContext({
				sendToken: ETHEREUM_TOKEN,
				sendTokenDecimals: ETHEREUM_TOKEN.decimals
			});
			const onAmountChange = vi.fn();

			renderWizardHost({ sendContext, onAmountChange });

			expect(onAmountChange).toHaveBeenLastCalledWith(cachedAmount);

			sendContext.sendToken.set(erc20Token);
			sendContext.sendTokenId.set(erc20Token.id);
			sendContext.sendTokenDecimals.set(erc20Token.decimals);

			await tick();

			expect(onAmountChange).toHaveBeenLastCalledWith(undefined);
		});

		it('clears the amount cached while the wizard was unmounted when the token changed', async () => {
			const sendContext = mockSendContext({
				sendToken: ETHEREUM_TOKEN,
				sendTokenDecimals: ETHEREUM_TOKEN.decimals
			});

			// The user types an amount for ETH, then steps back out of the flow.
			const { unmount } = renderWizardHost({ sendContext, onAmountChange: vi.fn() });

			unmount();

			// ... picks another token from the list and walks back into the flow. The amount is held by
			// the send modal, so it is still there when the wizard mounts again.
			sendContext.sendToken.set(erc20Token);
			sendContext.sendTokenId.set(erc20Token.id);
			sendContext.sendTokenDecimals.set(erc20Token.decimals);

			const onAmountChange = vi.fn();

			renderWizardHost({ sendContext, onAmountChange });

			await tick();

			expect(onAmountChange).toHaveBeenLastCalledWith(undefined);
		});

		it('keeps the amount when the wizard is remounted for the same token', async () => {
			const sendContext = mockSendContext({
				sendToken: ETHEREUM_TOKEN,
				sendTokenDecimals: ETHEREUM_TOKEN.decimals
			});

			const { unmount } = renderWizardHost({ sendContext, onAmountChange: vi.fn() });

			unmount();

			const onAmountChange = vi.fn();

			renderWizardHost({ sendContext, onAmountChange });

			await tick();

			expect(onAmountChange).toHaveBeenLastCalledWith(cachedAmount);
		});

		it('keeps the amount when only the destination changes', async () => {
			const sendContext = mockSendContext({
				sendToken: ETHEREUM_TOKEN,
				sendTokenDecimals: ETHEREUM_TOKEN.decimals
			});
			const onAmountChange = vi.fn();

			const { rerender } = renderWizardHost({ sendContext, onAmountChange });

			await rerender({
				currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
				destination: '0x2222222222222222222222222222222222222222',
				sendContext,
				sourceNetwork: ETHEREUM_NETWORK,
				nativeEthereumToken: ETHEREUM_TOKEN,
				amount: cachedAmount,
				onCloseStep: vi.fn(),
				onAmountChange
			});

			await tick();

			expect(onAmountChange).toHaveBeenLastCalledWith(cachedAmount);
		});

		it('keeps the amount when the store re-emits the same token as a fresh object', async () => {
			const sendContext = mockSendContext({
				sendToken: ETHEREUM_TOKEN,
				sendTokenDecimals: ETHEREUM_TOKEN.decimals
			});
			const onAmountChange = vi.fn();

			renderWizardHost({ sendContext, onAmountChange });

			// A custom-token reload rebuilds the token - and mints a fresh `TokenId` symbol for it.
			const reloadedToken: Token = {
				...ETHEREUM_TOKEN,
				id: parseTokenId(`${ETHEREUM_TOKEN.id.description}`)
			};

			sendContext.sendToken.set(reloadedToken);
			sendContext.sendTokenId.set(reloadedToken.id);

			await tick();

			expect(onAmountChange).toHaveBeenLastCalledWith(cachedAmount);
		});
	});
});
