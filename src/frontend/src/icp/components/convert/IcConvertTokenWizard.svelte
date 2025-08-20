<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import IcConvertForm from '$icp/components/convert/IcConvertForm.svelte';
	import IcConvertProgress from '$icp/components/convert/IcConvertProgress.svelte';
	import IcConvertReview from '$icp/components/convert/IcConvertReview.svelte';
	import BitcoinFeeContext from '$icp/components/fee/BitcoinFeeContext.svelte';
	import EthereumFeeContext from '$icp/components/fee/EthereumFeeContext.svelte';
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
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import {
		isConvertCkErc20ToErc20,
		isConvertCkEthToEth
	} from '$icp-eth/utils/cketh-transactions.utils';
	import DestinationWizardStep from '$lib/components/address/DestinationWizardStep.svelte';
	import SendQrCodeScan from '$lib/components/send/SendQrCodeScan.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import {
		TRACK_COUNT_CONVERT_CKBTC_TO_BTC_ERROR,
		TRACK_COUNT_CONVERT_CKBTC_TO_BTC_SUCCESS,
		TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_ERROR,
		TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_SUCCESS,
		TRACK_COUNT_CONVERT_CKETH_TO_ETH_ERROR,
		TRACK_COUNT_CONVERT_CKETH_TO_ETH_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { btcAddressMainnet, ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { WizardStepsConvert, WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { decodeQrCode } from '$lib/utils/qr-code.utils';

	export let currentStep: WizardStep | undefined;
	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let customDestination = '';
	export let convertProgressStep: string;
	export let formCancelAction: 'back' | 'close' = 'close';
	export let onIcQrCodeBack: () => void;

	const { sourceToken, destinationToken } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let defaultDestination = '';
	$: defaultDestination = isTokenCkBtcLedger($sourceToken)
		? ($btcAddressMainnet ?? '')
		: ($ethAddress ?? '');

	let isDestinationCustom = false;
	$: isDestinationCustom = !isNullishOrEmpty(customDestination);

	let networkId: NetworkId;
	$: networkId = $destinationToken.network.id;

	/**
	 * Bitcoin fee context store
	 */
	setContext<BitcoinFeeContextType>(BITCOIN_FEE_CONTEXT_KEY, {
		store: initBitcoinFeeStore()
	});

	/**
	 * Ethereum fee context store
	 */
	const { store: ethereumFeeStore } = setContext<EthereumFeeContextType>(ETHEREUM_FEE_CONTEXT_KEY, {
		store: initEthereumFeeStore()
	});

	const dispatch = createEventDispatcher();

	const convert = async () => {
		const destination = isNullishOrEmpty(customDestination)
			? defaultDestination
			: customDestination;

		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		if (invalidAmount(sendAmount) || isNullish(sendAmount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});
			return;
		}

		dispatch('icNext');

		try {
			// In case we are converting ckERC20 to ERC20, we need to include ckETH related fees in the transaction.
			const ckErc20ToErc20MaxCkEthFees: bigint | undefined = isConvertCkErc20ToErc20({
				token: $sourceToken as IcToken,
				networkId
			})
				? $ethereumFeeStore?.maxTransactionFee
				: undefined;

			const params: IcTransferParams = {
				to: destination,
				amount: parseToken({
					value: `${sendAmount}`,
					unitName: $sourceToken.decimals
				}),
				identity: $authIdentity,
				progress: (step: ProgressStepsSendIc) => (convertProgressStep = step),
				ckErc20ToErc20MaxCkEthFees
			};

			const trackAnalyticsOnSendComplete = () => {
				trackEvent({
					name: isNetworkIdBitcoin(networkId)
						? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_SUCCESS
						: isConvertCkEthToEth({ token: $sourceToken, networkId })
							? TRACK_COUNT_CONVERT_CKETH_TO_ETH_SUCCESS
							: TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_SUCCESS,
					metadata: {
						token: $sourceToken.symbol
					}
				});
			};

			await sendIc({
				...params,
				token: $sourceToken as IcToken,
				targetNetworkId: networkId,
				sendCompleted: trackAnalyticsOnSendComplete
			});

			convertProgressStep = ProgressStepsSendIc.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: isNetworkIdBitcoin(networkId)
					? TRACK_COUNT_CONVERT_CKBTC_TO_BTC_ERROR
					: isConvertCkEthToEth({ token: $sourceToken, networkId })
						? TRACK_COUNT_CONVERT_CKETH_TO_ETH_ERROR
						: TRACK_COUNT_CONVERT_CKERC20_TO_ERC20_ERROR,
				metadata: {
					token: $sourceToken.symbol
				}
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			dispatch('icBack');
		}
	};

	const close = () => dispatch('icClose');
	const back = () => dispatch('icBack');
</script>

<EthereumFeeContext {networkId}>
	<BitcoinFeeContext amount={sendAmount} {networkId} token={$sourceToken}>
		{#if currentStep?.name === WizardStepsConvert.CONVERT}
			<IcConvertForm
				destination={isDestinationCustom ? customDestination : defaultDestination}
				{isDestinationCustom}
				on:icNext
				on:icClose
				on:icDestination
				bind:sendAmount
				bind:receiveAmount
			>
				<svelte:fragment slot="cancel">
					{#if formCancelAction === 'back'}
						<ButtonBack onclick={back} />
					{:else}
						<ButtonCancel onclick={close} />
					{/if}
				</svelte:fragment>
			</IcConvertForm>
		{:else if currentStep?.name === WizardStepsConvert.REVIEW}
			<IcConvertReview
				destination={isDestinationCustom ? customDestination : defaultDestination}
				{isDestinationCustom}
				{receiveAmount}
				{sendAmount}
				on:icConvert={convert}
				on:icBack
			>
				<ButtonBack slot="cancel" onclick={back} />
			</IcConvertReview>
		{:else if currentStep?.name === WizardStepsConvert.CONVERTING}
			<IcConvertProgress bind:convertProgressStep />
		{:else if currentStep?.name === WizardStepsConvert.DESTINATION}
			<DestinationWizardStep
				{networkId}
				tokenStandard={$destinationToken.standard}
				on:icBack={back}
				bind:customDestination
				on:icQRCodeScan
				on:icDestinationBack
			>
				<svelte:fragment slot="title">{$i18n.convert.text.send_to}</svelte:fragment>
			</DestinationWizardStep>
		{:else if currentStep?.name === WizardStepsSend.QR_CODE_SCAN}
			<SendQrCodeScan
				expectedToken={$destinationToken}
				onDecodeQrCode={decodeQrCode}
				{onIcQrCodeBack}
				bind:destination={customDestination}
				bind:amount={sendAmount}
			/>
		{:else}
			<slot />
		{/if}
	</BitcoinFeeContext>
</EthereumFeeContext>
