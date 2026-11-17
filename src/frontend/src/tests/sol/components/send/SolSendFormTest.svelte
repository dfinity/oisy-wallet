<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { OptionAmount } from '$lib/types/send';
	import SolSendForm from '$sol/components/send/SolSendForm.svelte';

	// Binds the amount and the "Max" flag to stores, as the wizard binds them to its own state.
	type Props = Omit<ComponentProps<typeof SolSendForm>, 'amount' | 'amountSetToMax'> & {
		amount: Writable<OptionAmount>;
		amountSetToMax: Writable<boolean>;
	};

	let { amount, amountSetToMax, ...props }: Props = $props();
</script>

<SolSendForm {...props} bind:amount={$amount} bind:amountSetToMax={$amountSetToMax} />
