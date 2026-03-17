<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		amount: OptionAmount;
		stakeProgressStep: string;
		currentStep?: WizardStep;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	// eslint-disable-next-line svelte/no-unused-props
	let { amount = $bindable(), stakeProgressStep = $bindable() }: Props = $props();
</script>

<MessageBox styleClass="mt-6">{$i18n.stake.text.unsupported_token_staking}</MessageBox>
