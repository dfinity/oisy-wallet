<script lang="ts">
	import WalletConnectButton from '$lib/components/wallet-connect/WalletConnectButton.svelte';
	import { disconnectListener } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsShow } from '$lib/stores/toasts.store';

	const disconnect = async () => {
		await disconnectListener();

		toastsShow({
			text: $i18n.wallet_connect.info.disconnected,
			level: 'info',
			duration: 2000
		});
	};
</script>

<WalletConnectButton onclick={disconnect} />
