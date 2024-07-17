<script lang="ts">
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
</script>

<button
	on:click
	class="wallet-connect icon desktop-wide text-white"
	disabled={$addressNotLoaded}
	class:opacity-0={$addressNotLoaded}
>
	<IconWalletConnect />
	<span class="font-bold"><slot /></span>
</button>
