<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Readable } from 'svelte/store';
	import SwapEthForm from '$eth/components/swap/SwapEthForm.svelte';
	import type { OptionAmount } from '$lib/types/send';

	// Binds the amount and feeds LI.FI's fee from a store, as the wizard does: the fee changes while
	// the amount "Max" set stays the form's own.
	type Props = Omit<ComponentProps<typeof SwapEthForm>, 'swapAmount' | 'isLifi' | 'lifiFee'> & {
		lifiFee: Readable<bigint | undefined>;
	};

	let { lifiFee, ...props }: Props = $props();

	let swapAmount = $state<OptionAmount>();
</script>

<SwapEthForm {...props} isLifi lifiFee={$lifiFee} bind:swapAmount />
