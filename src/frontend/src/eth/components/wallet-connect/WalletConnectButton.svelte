<script lang="ts">
	import IconWalletConnectWhite from '$lib/components/icons/IconWalletConnectWhite.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
</script>

<button
	on:click
	class="wallet-connect icon desktop-wide"
	disabled={$addressNotLoaded}
	class:opacity-0={$addressNotLoaded}
>
	<IconWalletConnectWhite />
	<span class="text-white font-bold"><slot /></span>
</button>
