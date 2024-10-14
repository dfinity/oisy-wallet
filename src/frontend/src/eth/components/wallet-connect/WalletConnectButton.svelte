<script lang="ts">
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';
</script>

<button on:click class="tertiary text-primary h-10" disabled={$ethAddressNotLoaded}>
	<IconWalletConnect size="24" />
	<slot />
</button>

<style lang="scss">
	button {
		border-radius: var(--border-radius-sm-1_5x);

		&:hover {
			color: inherit;
		}
	}
</style>
