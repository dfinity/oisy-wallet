<script lang="ts">
	import IconWalletConnectLogo from '$lib/components/icons/IconWalletConnectLogo.svelte';
	import { addressNotLoaded } from '$lib/derived/address.derived';
</script>

<button
	on:click
	class="wallet-connect icon"
	disabled={$addressNotLoaded}
	class:opacity-50={$addressNotLoaded}
>
	<IconWalletConnectLogo />
	<span class="text-white font-bold text-xs"><slot /></span>
</button>
