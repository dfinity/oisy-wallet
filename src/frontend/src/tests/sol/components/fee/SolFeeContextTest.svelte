<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Readable } from 'svelte/store';
	import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';

	// Feeds `holdFee` from a store, as the wizards feed it from the "Max" flag: holding then starts and
	// ends without handing the context its token again.
	type Props = Omit<ComponentProps<typeof SolFeeContext>, 'holdFee'> & {
		holdFee: Readable<boolean>;
	};

	let { holdFee, ...props }: Props = $props();
</script>

<SolFeeContext {...props} holdFee={$holdFee} />
