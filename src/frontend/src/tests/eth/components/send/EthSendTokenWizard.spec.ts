import { fireEvent, render } from '@testing-library/svelte';
import { readable, writable, type Writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
import type { Token } from '$lib/types/token';

import EthSendTokenWizardTestHost from '$tests/eth/components/send/EthSendTokenWizardTestHost.svelte';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';

// services & utilities
import * as sendServices from '$eth/services/send.services';
import * as tokenUtils from '$eth/utils/token.utils';
import * as ckethServices from '$icp-eth/services/cketh.services';
import * as analytics from '$lib/services/analytics.services';
import * as nftServices from '$lib/services/nft.services';
import * as toasts from '$lib/stores/toasts.store';
import * as inputUtils from '$lib/utils/input.utils';

// derived
import * as addrDerived from '$lib/derived/address.derived';
import * as idDerived from '$lib/derived/auth.derived';
import * as exchDerived from '$lib/derived/exchange.derived';

// fee store init used by the wizard
import type { EthFeeStore, FeeStoreData } from '$eth/stores/eth-fee.store';
import * as feeStoreMod from '$eth/stores/eth-fee.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { WizardStep } from '@dfinity/gix-components';

describe('EthSendTokenWizard (single host)', () => {
	const fromAddr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
	const destination = '0x1111111111111111111111111111111111111111';

	let feeState: Writable<FeeStoreData>;

	let feeStore: EthFeeStore;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		// derived stores
		vi.spyOn(addrDerived, 'ethAddress', 'get').mockReturnValue(readable(fromAddr));
		vi.spyOn(idDerived, 'authIdentity', 'get').mockImplementation(() => readable(mockIdentity));
		vi.spyOn(exchDerived, 'exchanges', 'get').mockReturnValue(readable({}));

		// analytics + toast
		vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
		vi.spyOn(toasts, 'toastsError').mockImplementation(() => Symbol('toast'));

		// helpers
		vi.spyOn(inputUtils, 'invalidAmount').mockReturnValue(false);
		vi.spyOn(ckethServices, 'assertCkEthMinterInfoLoaded').mockReturnValue({ valid: true });
		vi.spyOn(tokenUtils, 'isErc20Icp').mockReturnValue(false);

		// fee store
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
			minGasFee: readable(undefined)
		}));

		// services
		vi.spyOn(sendServices, 'send').mockResolvedValue(
			{} as unknown as import('ethers/providers').TransactionResponse
		);
		vi.spyOn(nftServices, 'sendNft').mockResolvedValue(undefined);
	});

	const renderHost = (args: {
		currentStep: WizardStep;
		nft?: Nft;
		destination: string;
		sourceNetwork: typeof ETHEREUM_NETWORK;
		amount?: number | string;
		nativeEthereumToken: Token;
		sendToken: Token | NonFungibleToken;
		sendTokenId: string;
		sendTokenDecimals: number;
	}) =>
		render(EthSendTokenWizardTestHost, {
			props: {
				currentStep: args.currentStep,
				nft: args.nft,
				destination: args.destination,
				sourceNetwork: args.sourceNetwork,
				amount: args.amount ?? 1,
				nativeEthereumToken: args.nativeEthereumToken,
				sendToken: args.sendToken,
				sendTokenId: args.sendTokenId,
				sendTokenDecimals: args.sendTokenDecimals
			}
		});

	it('sends fungible token via executeSend on icSend', async () => {
		const { getByTestId } = renderHost({
			currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
			nft: undefined,
			destination,
			sourceNetwork: ETHEREUM_NETWORK,
			nativeEthereumToken: ETHEREUM_TOKEN,
			sendToken: ETHEREUM_TOKEN,
			sendTokenId: String(ETHEREUM_TOKEN.id),
			sendTokenDecimals: ETHEREUM_TOKEN.decimals
		});

		await fireEvent.click(getByTestId('eth-review-send'));
		await vi.runAllTimersAsync();

		expect(sendServices.send).toHaveBeenCalledOnce();

		expect(sendServices.send).toHaveBeenCalledWith(
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

		expect(nftServices.sendNft).not.toHaveBeenCalled();
	});

	it('sends NFT via sendNft on icSend', async () => {
		const nft: Nft = mockValidErc721Nft;
		const collectionToken: NonFungibleToken = mockValidErc721Token;

		const { getByTestId } = renderHost({
			currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
			nft,
			destination,
			sourceNetwork: ETHEREUM_NETWORK,
			nativeEthereumToken: ETHEREUM_TOKEN,
			sendToken: collectionToken,
			sendTokenId: String(collectionToken.id),
			sendTokenDecimals: 0
		});

		await fireEvent.click(getByTestId('eth-review-send'));
		await vi.runAllTimersAsync();

		expect(nftServices.sendNft).toHaveBeenCalledOnce();

		expect(nftServices.sendNft).toHaveBeenCalledWith(
			expect.objectContaining({
				token: collectionToken,
				tokenId: nft.id,
				toAddress: destination,
				fromAddress: fromAddr,
				gas: 100n,
				maxFeePerGas: 2_000_000n,
				maxPriorityFeePerGas: 1_000_000n
			})
		);

		expect(sendServices.send).not.toHaveBeenCalled();
	});

	it('shows a toast and aborts when destination is empty', async () => {
		const { getByTestId } = renderHost({
			currentStep: { name: WizardStepsSend.REVIEW, title: 'Review' },
			nft: undefined,
			destination: '',
			sourceNetwork: ETHEREUM_NETWORK,
			nativeEthereumToken: ETHEREUM_TOKEN,
			sendToken: ETHEREUM_TOKEN,
			sendTokenId: String(ETHEREUM_TOKEN.id),
			sendTokenDecimals: ETHEREUM_TOKEN.decimals
		});

		await fireEvent.click(getByTestId('eth-review-send'));
		await vi.runAllTimersAsync();

		expect(toasts.toastsError).toHaveBeenCalledOnce();

		expect(sendServices.send).not.toHaveBeenCalled();

		expect(nftServices.sendNft).not.toHaveBeenCalled();
	});
});
