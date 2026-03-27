<script lang="ts">
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		application: string;
	}

	let { application }: Props = $props();
</script>

<WalletConnectModalValue label={$i18n.wallet_connect.text.application} ref="application">
	{application}
</WalletConnectModalValue>
