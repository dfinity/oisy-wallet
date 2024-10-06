<script lang="ts">
	import { type WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import BitcoinFeeContext from '$icp/components/fee/BitcoinFeeContext.svelte';
	import EthereumFeeContext from '$icp/components/fee/EthereumFeeContext.svelte';
	import IcSendForm from '$icp/components/send/IcSendForm.svelte';
	import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
	import IcSendReview from '$icp/components/send/IcSendReview.svelte';
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
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { isConvertCkErc20ToErc20 } from '$icp-eth/utils/cketh-transactions.utils';
	import SendQRCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	/**
	 * Send context store
	 */

	const { sendTokenAsIcToken: sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Props
	 */

	export let currentStep: WizardStep | undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let destination = '';
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;

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
				token: $sendToken,
				networkId
			})
				? $ethereumFeeStore?.maxTransactionFee
				: undefined;

			const params: IcTransferParams = {
				to: destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendToken.decimals
				}),
				identity: $authIdentity,
				progress: (step: ProgressStepsSendIc) => (sendProgressStep = step),
				ckErc20ToErc20MaxCkEthFees
			};

			await sendIc({
				...params,
				token: $sendToken,
				targetNetworkId: networkId
			});

			sendProgressStep = ProgressStepsSendIc.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
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

<EthereumFeeContext token={$sendToken} {networkId}>
	<BitcoinFeeContext token={$sendToken} {amount} {networkId}>
		{#if currentStep?.name === WizardStepsSend.REVIEW}
			<IcSendReview
				on:icBack
				on:icSend={send}
				token={$sendToken}
				{destination}
				{amount}
				{networkId}
			/>
		{:else if currentStep?.name === WizardStepsSend.SENDING}
			<IcSendProgress bind:sendProgressStep token={$sendToken} {networkId} />
		{:else if currentStep?.name === WizardStepsSend.SEND}
			<IcSendForm
				token={$sendToken}
				on:icNext
				bind:destination
				bind:amount
				bind:networkId
				on:icQRCodeScan
			>
				<svelte:fragment slot="cancel">
					<ButtonBack on:click={back} />
				</svelte:fragment>
			</IcSendForm>
		{:else if currentStep?.name === WizardStepsSend.QR_CODE_SCAN}
			<SendQRCodeScan
				expectedToken={$sendToken}
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
