<script lang="ts">
	import { fade } from 'svelte/transition';
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';

	export let ariaLabel: string | undefined = undefined;
</script>

<button
	aria-label={ariaLabel}
	on:click
	in:fade
	class="tertiary-alt h-10"
	class:icon={!$$slots.default}
	disabled={$ethAddressNotLoaded}
>
	<IconWalletConnect size="24" />
	<slot />
</button>
