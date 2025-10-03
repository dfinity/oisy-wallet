<script lang="ts">
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		destination: string;
	}

	let { destination }: Props = $props();
</script>

<WalletConnectModalValue label={$i18n.send.text.destination} ref="destination">
	{shortenWithMiddleEllipsis({ text: destination })}
</WalletConnectModalValue>
