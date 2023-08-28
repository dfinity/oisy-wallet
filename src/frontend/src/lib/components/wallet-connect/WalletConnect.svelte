<script lang="ts">
	import WalletConnectSession from '$lib/components/wallet-connect/WalletConnectSession.svelte';
	import WalletConnectSign from '$lib/components/wallet-connect/WalletConnectSign.svelte';
	import type { WalletConnectListener } from '$lib/types/wallet-connect';
	import WalletConnectSend from '$lib/components/wallet-connect/WalletConnectSend.svelte';

	let listener: WalletConnectListener | undefined | null;
</script>

<WalletConnectSession bind:listener />

<WalletConnectSign bind:listener />

<WalletConnectSend bind:listener />
