<script lang="ts">
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { ethAddressNotLoaded } from '$lib/derived/address.derived';

	export let ariaLabel: string;
</script>

<ButtonIcon on:click {ariaLabel} disabled={$ethAddressNotLoaded}>
	<IconWalletConnect size="24" slot="icon" />
	<slot />
</ButtonIcon>
