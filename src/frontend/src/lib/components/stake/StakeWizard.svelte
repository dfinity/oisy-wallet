<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { getContext } from 'svelte';
	import GldtStakeWizard from '$icp/components/stake/gldt/GldtStakeWizard.svelte';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';
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

	let isGldtToken = $derived(isGLDTToken($sendToken));
</script>

{#if isGldtToken}
	<GldtStakeWizard {currentStep} {onBack} {onClose} {onNext} bind:amount bind:stakeProgressStep />
{:else}
	<MessageBox styleClass="mt-6">{$i18n.stake.text.unsupported_token_staking}</MessageBox>
{/if}
