<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SendQrCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { SolAddress } from '$lib/types/address';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdSolana,
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import { decodeQrCode } from '$lib/utils/qr-code.utils';
	import SolSendForm from '$sol/components/send/SolSendForm.svelte';
	import SolSendProgress from '$sol/components/send/SolSendProgress.svelte';
	import SolSendReview from '$sol/components/send/SolSendReview.svelte';

	export let currentStep: WizardStep | undefined;
	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let sendProgressStep: string;
	export let formCancelAction: 'back' | 'close' = 'close';

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let network: Network | undefined = undefined;
	$: network = $sendToken.network;

	let networkId: NetworkId | undefined = undefined;
	$: networkId = $sendToken.network.id;

	let source: SolAddress;
	$: source =
		(isNetworkIdSOLTestnet(networkId)
			? $solAddressTestnet
			: isNetworkIdSOLDevnet(networkId)
				? $solAddressDevnet
				: isNetworkIdSOLLocal(networkId)
					? $solAddressLocal
					: $solAddressMainnet) ?? '';

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
			// TODO: add tracking
			// TODO: add sending function

			sendProgressStep = ProgressStepsSendSol.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			dispatch('icBack');
		}
	};
</script>

{#if currentStep?.name === WizardStepsSend.REVIEW}
	<SolSendReview on:icBack on:icSend={send} {destination} {amount} {network} {source} />
{:else if currentStep?.name === WizardStepsSend.SENDING}
	<SolSendProgress bind:sendProgressStep />
{:else if currentStep?.name === WizardStepsSend.SEND}
	<SolSendForm on:icNext on:icClose bind:destination bind:amount on:icQRCodeScan {source}>
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
