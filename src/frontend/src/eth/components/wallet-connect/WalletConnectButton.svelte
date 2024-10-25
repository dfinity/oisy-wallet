<script lang="ts">
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';

	export let ariaLabel: string | undefined = undefined;
</script>

<button
	aria-label={ariaLabel}
	on:click
	class="tertiary text-primary h-10"
	class:icon={!$$slots.default}
	disabled={$ethAddressNotLoaded}
>
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
