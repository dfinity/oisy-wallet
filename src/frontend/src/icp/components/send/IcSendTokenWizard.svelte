<script lang="ts">
	import { type WizardStep } from '@dfinity/gix-components';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import IcSendForm from './IcSendForm.svelte';
	import IcSendReview from './IcSendReview.svelte';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { toastsError } from '$lib/stores/toasts.store';
	import { isNullish } from '@dfinity/utils';
	import { sendIc } from '$icp/services/ic-send.services';
	import { parseToken } from '$lib/utils/parse.utils';
	import { authStore } from '$lib/stores/auth.store';
	import type { NetworkId } from '$lib/types/network';
	import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
	import type { IcTransferParams } from '$icp/types/ic-send';
	import {
		BITCOIN_FEE_CONTEXT_KEY,
		type BitcoinFeeContext as BitcoinFeeContextType,
		initBitcoinFeeStore
	} from '$icp/stores/bitcoin-fee.store';
	import { createEventDispatcher, setContext } from 'svelte';
	import BitcoinFeeContext from '$icp/components/fee/BitcoinFeeContext.svelte';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import {
		isNetworkIdETH,
		isTokenCkErc20Ledger,
		isTokenCkEthLedger
	} from '$icp/utils/ic-send.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		initTimedEvent,
		trackTimedEventSuccess,
		trackEvent,
		trackTimedEventError
	} from '$lib/services/analytics.services';
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
	import EthereumFeeContext from '$icp/components/fee/EthereumFeeContext.svelte';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext as EthereumFeeContextType,
		initEthereumFeeStore
	} from '$icp/stores/ethereum-fee.store';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { icDecodeQrCode } from '$icp/utils/qr-code.utils';
	import SendQRCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import { token } from '$lib/stores/token.store';
	import { tokenAsIcToken } from '$icp/derived/ic-token.derived';

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
				: isNetworkIdETH(networkId) && isTokenCkEthLedger($token)
					? TRACK_DURATION_CONVERT_CKETH_TO_ETH
					: isNetworkIdETH(networkId) && isTokenCkErc20Ledger($token)
						? TRACK_DURATION_CONVERT_CKERC20_TO_ERC20
						: TRACK_DURATION_IC_SEND,
			metadata: {
				token: $token.symbol
			}
		});

		try {
			const params: IcTransferParams = {
				to: destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $token.decimals
				}),
				identity: $authStore.identity,
				progress: (step: ProgressStepsSendIc) => (sendProgressStep = step)
			};

			await sendIc({
				...params,
				token: $tokenAsIcToken,
				targetNetworkId: networkId
			});

			await Promise.allSettled([
				trackTimedEventSuccess(timedEvent),
				trackEvent({
					name: isNetworkIdBitcoin(networkId)
						? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_SUCCESS
						: isNetworkIdETH(networkId) && isTokenCkEthLedger($token)
							? TRACK_COUNT_CONVERT_CKETH_TO_ETH_SUCCESS
							: isNetworkIdETH(networkId) && isTokenCkErc20Ledger($token)
								? TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_SUCCESS
								: TRACK_COUNT_IC_SEND_SUCCESS,
					metadata: {
						token: $token.symbol
					}
				})
			]);

			sendProgressStep = ProgressStepsSendIc.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			await Promise.allSettled([
				trackTimedEventError(timedEvent),
				trackEvent({
					name: isNetworkIdBitcoin(networkId)
						? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_ERROR
						: isNetworkIdETH(networkId) && isTokenCkEthLedger($token)
							? TRACK_COUNT_CONVERT_CKETH_TO_ETH_ERROR
							: isNetworkIdETH(networkId) && isTokenCkErc20Ledger($token)
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
