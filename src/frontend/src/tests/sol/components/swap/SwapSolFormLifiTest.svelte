<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Readable, Writable } from 'svelte/store';
	import type { OptionAmount } from '$lib/types/send';
	import SwapSolForm from '$sol/components/swap/SwapSolForm.svelte';

	// Binds the amount and feeds LI.FI's ceiling from a store, as the wizard does: the ceiling changes
	// while the amount "Max" set stays the form's own.
	type Props = Omit<ComponentProps<typeof SwapSolForm>, 'swapAmount' | 'lifiFee'> & {
		lifiFee: Readable<bigint | undefined>;
		amount: Writable<OptionAmount>;
	};

	let { lifiFee, amount, isLifi = true, ...props }: Props = $props();
</script>

<SwapSolForm {...props} {isLifi} lifiFee={$lifiFee} bind:swapAmount={$amount} />
