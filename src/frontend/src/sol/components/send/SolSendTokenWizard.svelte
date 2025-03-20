<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { assertNonNullish, isNullish } from '@dfinity/utils';
	import { isSolanaError, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED } from '@solana/kit';
	import { createEventDispatcher, getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TESTNET_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import SendQrCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import {
		TRACK_COUNT_SOL_SEND_ERROR,
		TRACK_COUNT_SOL_SEND_SUCCESS
	} from '$lib/constants/analytics.contants';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionSolAddress } from '$lib/types/address';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdSolana,
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { decodeQrCode } from '$lib/utils/qr-code.utils';
	import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
	import SolSendForm from '$sol/components/send/SolSendForm.svelte';
	import SolSendReview from '$sol/components/send/SolSendReview.svelte';
	import { sendSteps } from '$sol/constants/steps.constants';
	import { sendSol } from '$sol/services/sol-send.services';
	import {
		SOL_FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$sol/stores/sol-fee.store';

	export let currentStep: WizardStep | undefined;
	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let sendProgressStep: string;
	export let formCancelAction: 'back' | 'close' = 'close';

	const { sendToken, sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let network: Network | undefined = undefined;
	$: network = $sendToken.network;

	let networkId: NetworkId | undefined = undefined;
	$: networkId = $sendToken.network.id;

	let source: OptionSolAddress;
	let solanaNativeToken: Token;
	$: [source, solanaNativeToken] = isNetworkIdSOLTestnet(networkId)
		? [$solAddressTestnet, SOLANA_TESTNET_TOKEN]
		: isNetworkIdSOLDevnet(networkId)
			? [$solAddressDevnet, SOLANA_DEVNET_TOKEN]
			: isNetworkIdSOLLocal(networkId)
				? [$solAddressLocal, SOLANA_LOCAL_TOKEN]
				: [$solAddressMainnet, SOLANA_TOKEN];

	/**
	 * Fee context store
	 */

	let feeStore = initFeeStore();
	let prioritizationFeeStore = initFeeStore();
	let ataFeeStore = initFeeStore();

	let feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set(solanaNativeToken.symbol);

	let feeDecimalsStore = writable<number | undefined>(undefined);
	$: feeDecimalsStore.set(solanaNativeToken.decimals);

	setContext<FeeContextType>(
		SOL_FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			prioritizationFeeStore,
			ataFeeStore,
			feeSymbolStore,
			feeDecimalsStore
		})
	);

	/**
	 * Send
	 */

	const dispatch = createEventDispatcher();

	const close = () => dispatch('icClose');
	const back = () => dispatch('icSendBack');

	const send = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish(networkId) || !isNetworkIdSolana(networkId)) {
			toastsError({
				msg: { text: $i18n.send.error.no_solana_network_id }
			});
			return;
		}

		// This should not happen, it is just a safety check for types
		assertNonNullish(source);

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
			await sendSol({
				identity: $authIdentity,
				progress: (step: ProgressStepsSendSol) => (sendProgressStep = step),
				token: $sendToken,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}).toBigInt(),
				prioritizationFee: $prioritizationFeeStore ?? 0n,
				destination,
				source
			});

			await trackEvent({
				name: TRACK_COUNT_SOL_SEND_SUCCESS,
				metadata: {
					token: $sendToken.symbol
				}
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			await trackEvent({
				name: TRACK_COUNT_SOL_SEND_ERROR,
				metadata: {
					token: $sendToken.symbol
				}
			});

			const errorMsg = isSolanaError(err, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)
				? $i18n.send.error.solana_transaction_expired
				: $i18n.send.error.unexpected;

			toastsError({
				msg: { text: errorMsg },
				err
			});

			dispatch('icBack');
		}
	};
</script>

<SolFeeContext observe={currentStep?.name !== WizardStepsSend.SENDING} {destination}>
	{#if currentStep?.name === WizardStepsSend.REVIEW}
		<SolSendReview
			on:icBack
			on:icSend={send}
			{destination}
			{amount}
			{network}
			source={source ?? ''}
		/>
	{:else if currentStep?.name === WizardStepsSend.SENDING}
		<InProgressWizard progressStep={sendProgressStep} steps={sendSteps($i18n)} />
	{:else if currentStep?.name === WizardStepsSend.SEND}
		<SolSendForm
			on:icNext
			on:icClose
			bind:destination
			bind:amount
			on:icQRCodeScan
			source={source ?? ''}
		>
			<svelte:fragment slot="cancel">
				{#if formCancelAction === 'back'}
					<ButtonBack on:click={back} />
				{:else}
					<ButtonCancel on:click={close} />
				{/if}
			</svelte:fragment>
		</SolSendForm>
	{:else if currentStep?.name === WizardStepsSend.QR_CODE_SCAN}
		<SendQrCodeScan
			expectedToken={$sendToken}
			bind:destination
			bind:amount
			{decodeQrCode}
			on:icQRCodeBack
		/>
	{:else}
		<slot />
	{/if}
</SolFeeContext>
