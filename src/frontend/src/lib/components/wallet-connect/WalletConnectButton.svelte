<script lang="ts">
	import { fade } from 'svelte/transition';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';

	export let ariaLabel: string | undefined = undefined;
</script>

<button
	class="tertiary-alt h-10"
	class:icon={!$$slots.default}
	aria-label={ariaLabel}
	disabled={$ethAddressNotLoaded}
	on:click
	in:fade
>
	<IconWalletConnect size="24" />
	<slot />
</button>
