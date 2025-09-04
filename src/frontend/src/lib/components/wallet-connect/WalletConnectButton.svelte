<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import { ethAddressNotLoaded, solAddressMainnetNotLoaded } from '$lib/derived/address.derived';

	interface Props {
		ariaLabel?: string;
		onclick: () => void;
		children?: Snippet;
	}

	let { ariaLabel, onclick, children }: Props = $props();
</script>

<button
	class="tertiary-alt h-10"
	class:icon={isNullish(children)}
	aria-label={ariaLabel}
	disabled={$ethAddressNotLoaded && $solAddressMainnetNotLoaded}
	{onclick}
	in:fade
>
	<IconWalletConnect size="24" />
	{@render children?.()}
</button>
