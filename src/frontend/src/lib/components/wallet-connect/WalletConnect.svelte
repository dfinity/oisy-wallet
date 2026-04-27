<script lang="ts">
	import WalletConnectButton from '$lib/components/wallet-connect/WalletConnectButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();

	const openSessions = () => {
		modalStore.openWalletConnectSessions(modalId);
	};
</script>

<WalletConnectButton onclick={openSessions} />
