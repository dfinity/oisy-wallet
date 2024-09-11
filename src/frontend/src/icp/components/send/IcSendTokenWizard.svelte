<script lang="ts">
	import { type WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import IcSendForm from './IcSendForm.svelte';
	import IcSendReview from './IcSendReview.svelte';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { enableTwinTokenInUserTokens } from '$eth/services/erc20-user-tokens-services';
	import BitcoinFeeContext from '$icp/components/fee/BitcoinFeeContext.svelte';
	import EthereumFeeContext from '$icp/components/fee/EthereumFeeContext.svelte';
	import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
	import { tokenAsIcToken } from '$icp/derived/ic-token.derived';
	import { sendIc } from '$icp/services/ic-send.services';
	import {
		BITCOIN_FEE_CONTEXT_KEY,
		type BitcoinFeeContext as BitcoinFeeContextType,
		initBitcoinFeeStore
	} from '$icp/stores/bitcoin-fee.store';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext as EthereumFeeContextType,
		initEthereumFeeStore
	} from '$icp/stores/ethereum-fee.store';
	import type { IcTransferParams } from '$icp/types/ic-send';
	import { icDecodeQrCode } from '$icp/utils/qr-code.utils';
	import {
		ckEthereumTwinTokenId,
		ckEthereumTwinTokenNetworkId
	} from '$icp-eth/derived/cketh.derived';
	import {
		isConvertCkErc20ToErc20,
		isConvertCkEthToEth
	} from '$icp-eth/utils/cketh-transactions.utils';
	import SendQRCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import {
		TRACK_COUNT_CONVERT_CKBTC_TO_BTC_ERROR,
		TRACK_COUNT_CONVERT_CKBTC_TO_BTC_SUCCESS,
		TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_ERROR,
		TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_SUCCESS,
		TRACK_COUNT_CONVERT_CKETH_TO_ETH_ERROR,
		TRACK_COUNT_CONVERT_CKETH_TO_ETH_SUCCESS,
		TRACK_COUNT_IC_SEND_ERROR,
		TRACK_COUNT_IC_SEND_SUCCESS,
		TRACK_DURATION_CONVERT_CKBTC_TO_BTC,
		TRACK_DURATION_CONVERT_CKERC20_TO_ERC20,
		TRACK_DURATION_CONVERT_CKETH_TO_ETH,
		TRACK_DURATION_IC_SEND
	} from '$lib/constants/analytics.contants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import {
		initTimedEvent,
		trackTimedEventSuccess,
		trackEvent,
		trackTimedEventError
	} from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	/**
	 * Props
	 */

	export let currentStep: WizardStep | undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let destination = '';
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;
	export let formCancelAction: 'back' | 'close' = 'close';

	const dispatch = createEventDispatcher();

	/**
	 * Send
	 */

	const send = async () => {
		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});
			return;
		}

		if (isNullish($token)) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_undefined }
			});
			return;
		}

		dispatch('icNext');

		const timedEvent = initTimedEvent({
			name: isNetworkIdBitcoin(networkId)
				? TRACK_DURATION_CONVERT_CKBTC_TO_BTC
				: isConvertCkEthToEth({ token: $token, networkId })
					? TRACK_DURATION_CONVERT_CKETH_TO_ETH
					: isConvertCkErc20ToErc20({ token: $token, networkId })
						? TRACK_DURATION_CONVERT_CKERC20_TO_ERC20
						: TRACK_DURATION_IC_SEND,
			metadata: {
				token: $token.symbol
			}
		});

		try {
			const convertCkErc20ToErc20 = isConvertCkErc20ToErc20({
				token: $tokenAsIcToken,
				networkId
			});

			// In case we are converting ckERC20 to ERC20, we need to include ckETH related fees in the transaction.
			const ckErc20ToErc20MaxCkEthFees: bigint | undefined = convertCkErc20ToErc20
				? $ethereumFeeStore?.maxTransactionFee
				: undefined;

			const params: IcTransferParams = {
				to: destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $token.decimals
				}),
				identity: $authIdentity,
				progress: (step: ProgressStepsSendIc) => (sendProgressStep = step),
				ckErc20ToErc20MaxCkEthFees
			};

			const trackAnalyticsOnSendComplete = async () => {
				await Promise.allSettled([
					trackTimedEventSuccess(timedEvent),
					trackEvent({
						name: isNetworkIdBitcoin(networkId)
							? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_SUCCESS
							: isConvertCkEthToEth({ token: $token, networkId })
								? TRACK_COUNT_CONVERT_CKETH_TO_ETH_SUCCESS
								: isConvertCkErc20ToErc20({ token: $token, networkId })
									? TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_SUCCESS
									: TRACK_COUNT_IC_SEND_SUCCESS,
						metadata: {
							token: $token.symbol
						}
					})
				]);
			};

			await sendIc({
				...params,
				token: $tokenAsIcToken,
				targetNetworkId: networkId,
				sendCompleted: trackAnalyticsOnSendComplete
			});

			// In case of conversion to ERC20, we make sure that the token is enabled in the list of tokens.
			// No need to do it for ETH as it is always enabled by default.
			// The flow does not wait for the token to be enabled, as it is not critical for the user,
			// and it actually changes `erc20UserTokensStore` that re-triggers variables/stores in Manage Modal (such as `ckEthereumTwinToken` and `steps`).
			if (convertCkErc20ToErc20) {
				enableTwinTokenInUserTokens({
					identity: $authIdentity,
					twinToken: $erc20Tokens.find(
						({ id: tokenId, network: { id: networkId } }) =>
							tokenId === $ckEthereumTwinTokenId && networkId === $ckEthereumTwinTokenNetworkId
					)
				});
			}

			sendProgressStep = ProgressStepsSendIc.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			await Promise.allSettled([
				trackTimedEventError(timedEvent),
				trackEvent({
					name: isNetworkIdBitcoin(networkId)
						? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_ERROR
						: isConvertCkEthToEth({ token: $token, networkId })
							? TRACK_COUNT_CONVERT_CKETH_TO_ETH_ERROR
							: isConvertCkErc20ToErc20({ token: $token, networkId })
								? TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_ERROR
								: TRACK_COUNT_IC_SEND_ERROR,
					metadata: {
						token: $token.symbol
					}
				})
			]);

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			dispatch('icBack');
		}
	};

	/**
	 * Bitcoin fee context store
	 */

	setContext<BitcoinFeeContextType>(BITCOIN_FEE_CONTEXT_KEY, {
		store: initBitcoinFeeStore()
	});

	/**
	 * Ethereum fee context store
	 */

	setContext<EthereumFeeContextType>(ETHEREUM_FEE_CONTEXT_KEY, {
		store: initEthereumFeeStore()
	});

	const { store: ethereumFeeStore } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	const back = () => dispatch('icBack');
	const close = () => dispatch('icClose');
</script>

<EthereumFeeContext {networkId}>
	<BitcoinFeeContext {amount} {networkId}>
		{#if currentStep?.name === WizardStepsSend.REVIEW}
			<IcSendReview on:icBack on:icSend={send} {destination} {amount} {networkId} />
		{:else if currentStep?.name === WizardStepsSend.SENDING}
			<IcSendProgress bind:sendProgressStep {networkId} />
		{:else if currentStep?.name === WizardStepsSend.SEND}
			<IcSendForm on:icNext bind:destination bind:amount bind:networkId on:icQRCodeScan>
				<svelte:fragment slot="cancel">
					{#if formCancelAction === 'back'}
						<button type="button" class="secondary block flex-1" on:click={back}
							>{$i18n.core.text.back}</button
						>
					{:else}
						<button type="button" class="secondary block flex-1" on:click={close}
							>{$i18n.core.text.cancel}</button
						>
					{/if}
				</svelte:fragment>
			</IcSendForm>
		{:else if currentStep?.name === WizardStepsSend.QR_CODE_SCAN}
			<SendQRCodeScan
				expectedToken={$token}
				bind:destination
				bind:amount
				decodeQrCode={icDecodeQrCode}
				on:icQRCodeBack
			/>
		{:else}
			<slot />
		{/if}
	</BitcoinFeeContext>
</EthereumFeeContext>
