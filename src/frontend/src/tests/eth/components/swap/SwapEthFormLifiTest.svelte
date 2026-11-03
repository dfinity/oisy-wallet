<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Readable, Writable } from 'svelte/store';
	import SwapEthForm from '$eth/components/swap/SwapEthForm.svelte';
	import type { OptionAmount } from '$lib/types/send';

	// Binds the amount and feeds LI.FI's fee from stores, as the wizard does: the fee changes while
	// the amount "Max" set stays the form's own, and the amount outlives the form, which every step
	// change rebuilds. A LI.FI offer unless told otherwise, as while the offers reload or after
	// another provider was chosen.
	type Props = Omit<ComponentProps<typeof SwapEthForm>, 'swapAmount' | 'lifiFee'> & {
		lifiFee: Readable<bigint | undefined>;
		amount: Writable<OptionAmount>;
	};

	let { lifiFee, amount, isLifi = true, ...props }: Props = $props();
</script>

<SwapEthForm {...props} {isLifi} lifiFee={$lifiFee} bind:swapAmount={$amount} />
