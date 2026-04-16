<script lang="ts">
	import IconWalletConnect from '$lib/components/icons/IconWalletConnect.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ethAddressNotLoaded, solAddressMainnetNotLoaded } from '$lib/derived/address.derived';

	interface Props {
		loading?: boolean;
		ariaLabel?: string;
		onclick: () => void;
	}

	let { loading = false, ariaLabel, onclick }: Props = $props();

	let disabled = $derived(loading || ($ethAddressNotLoaded && $solAddressMainnetNotLoaded));
</script>

<Button {ariaLabel} {disabled} {onclick} paddingSmall styleClass="h-10 px-2 rounded-xl">
	<IconWalletConnect size="24" />
</Button>
