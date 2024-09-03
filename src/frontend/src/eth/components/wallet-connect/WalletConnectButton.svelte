<script lang="ts">
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';
</script>

<button
	on:click
	class="wallet-connect icon desktop-wide text-white"
	disabled={$ethAddressNotLoaded}
	class:opacity-0={$ethAddressNotLoaded}
>
	<IconWalletConnect size="24" />
	<span class="font-bold"><slot /></span>
</button>
