<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import BitcoinFeeContext from '$icp/components/fee/BitcoinFeeContext.svelte';
	import EthereumFeeContext from '$icp/components/fee/EthereumFeeContext.svelte';
	import IcSendForm from '$icp/components/send/IcSendForm.svelte';
	import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
	import IcSendReview from '$icp/components/send/IcSendReview.svelte';
	import { tokenWithFallbackAsIcToken } from '$icp/derived/ic-token.derived';
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
	import type { IcToken } from '$icp/types/ic-token';
	import {
		isConvertCkErc20ToErc20,
		isConvertCkEthToEth
	} from '$icp-eth/utils/cketh-transactions.utils';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import {
		TRACK_COUNT_CONVERT_CKBTC_TO_BTC_ERROR,
		TRACK_COUNT_CONVERT_CKBTC_TO_BTC_SUCCESS,
		TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_ERROR,
		TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_SUCCESS,
		TRACK_COUNT_CONVERT_CKETH_TO_ETH_ERROR,
		TRACK_COUNT_CONVERT_CKETH_TO_ETH_SUCCESS,
		TRACK_COUNT_IC_SEND_ERROR,
		TRACK_COUNT_IC_SEND_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	/**
	 * Props
	 */

	export let source: string;
	export let currentStep: WizardStep | undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let sendProgressStep: string;

	const dispatch = createEventDispatcher();

	/**
	 * Send context store
	 */

	const { sendTokenDecimals, sendToken, sendTokenSymbol } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

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

		if (isNullish($sendToken)) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_undefined }
			});
			return;
		}

		dispatch('icNext');

		try {
			// In case we are converting ckERC20 to ERC20, we need to include ckETH related fees in the transaction.
			const ckErc20ToErc20MaxCkEthFees: bigint | undefined = isConvertCkErc20ToErc20({
				token: $sendToken as IcToken,
				networkId
			})
				? $ethereumFeeStore?.maxTransactionFee
				: undefined;

			const params: IcTransferParams = {
				to: destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				identity: $authIdentity,
				progress: (step: ProgressStepsSendIc) => (sendProgressStep = step),
				ckErc20ToErc20MaxCkEthFees
			};

			const trackAnalyticsOnSendComplete = () => {
				trackEvent({
					name: isNetworkIdBitcoin(networkId)
						? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_SUCCESS
						: isConvertCkEthToEth({ token: $sendToken, networkId })
							? TRACK_COUNT_CONVERT_CKETH_TO_ETH_SUCCESS
							: isConvertCkErc20ToErc20({ token: $sendToken, networkId })
								? TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_SUCCESS
								: TRACK_COUNT_IC_SEND_SUCCESS,
					metadata: {
						token: $sendTokenSymbol
					}
				});
			};

			await sendIc({
				...params,
				token: $sendToken as IcToken,
				targetNetworkId: networkId,
				sendCompleted: trackAnalyticsOnSendComplete
			});

			sendProgressStep = ProgressStepsSendIc.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: isNetworkIdBitcoin(networkId)
					? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_ERROR
					: isConvertCkEthToEth({ token: $sendToken, networkId })
						? TRACK_COUNT_CONVERT_CKETH_TO_ETH_ERROR
						: isConvertCkErc20ToErc20({ token: $sendToken, networkId })
							? TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_ERROR
							: TRACK_COUNT_IC_SEND_ERROR,
				metadata: {
					token: $sendTokenSymbol
				}
			});

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

	const back = () => dispatch('icSendBack');
	const close = () => dispatch('icClose');
</script>

<EthereumFeeContext {networkId}>
	<BitcoinFeeContext {amount} {networkId} token={$tokenWithFallbackAsIcToken}>
		{#if currentStep?.name === WizardStepsSend.REVIEW}
			<IcSendReview on:icBack on:icSend={send} {destination} {amount} {networkId} />
		{:else if currentStep?.name === WizardStepsSend.SENDING}
			<IcSendProgress bind:sendProgressStep />
		{:else if currentStep?.name === WizardStepsSend.SEND}
			<IcSendForm
				on:icNext
				on:icBack
				on:icTokensList
				bind:destination
				bind:amount
				bind:networkId
				{source}
			>
				<ButtonBack onclick={back} slot="cancel" />
			</IcSendForm>
		{:else}
			<slot />
		{/if}
	</BitcoinFeeContext>
</EthereumFeeContext>
