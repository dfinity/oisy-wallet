<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Readable, Writable } from 'svelte/store';
	import SwapEthForm from '$eth/components/swap/SwapEthForm.svelte';
	import type { OptionAmount } from '$lib/types/send';

	// Binds the amount and feeds LI.FI's fee from stores, as the wizard does: the fee changes while
	// the amount "Max" set stays the form's own, and the amount outlives the form, which every step
	// change rebuilds.
	type Props = Omit<ComponentProps<typeof SwapEthForm>, 'swapAmount' | 'isLifi' | 'lifiFee'> & {
		lifiFee: Readable<bigint | undefined>;
		amount: Writable<OptionAmount>;
	};

	let { lifiFee, amount, ...props }: Props = $props();
</script>

<SwapEthForm {...props} isLifi lifiFee={$lifiFee} bind:swapAmount={$amount} />
