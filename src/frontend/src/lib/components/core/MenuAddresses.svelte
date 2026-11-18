<script lang="ts">
	import WalletAddresses from '$lib/components/core/WalletAddresses.svelte';

	interface Props {
		onReceiveClick?: () => void;
	}

	let { onReceiveClick }: Props = $props();
</script>

<!-- The same entry on every page: the full list of the user's regular wallet addresses. -->
<WalletAddresses onClick={onReceiveClick} />
