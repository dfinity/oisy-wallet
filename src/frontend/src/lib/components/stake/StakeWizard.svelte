<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
	import GldtStakeWizard from '$icp/components/stake/gldt/GldtStakeWizard.svelte';
	import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
	import { isTokenIcrc } from '$icp/utils/icrc.utils';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		amount: OptionAmount;
		stakeProgressStep: string;
		currentStep?: WizardStep;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	let {
		amount = $bindable(),
		stakeProgressStep = $bindable(),
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let isGldtToken = $derived(
		isTokenIcrc($sendToken) &&
			($sendToken as IcrcCustomToken).ledgerCanisterId === GLDT_LEDGER_CANISTER_ID
	);
</script>

{#if isGldtToken}
	<GldtStakeWizard {currentStep} {onBack} {onClose} {onNext} bind:amount bind:stakeProgressStep />
{:else}
	<div class="mt-6"><MessageBox>{$i18n.stake.text.unsupported_token_staking}</MessageBox></div>
{/if}
