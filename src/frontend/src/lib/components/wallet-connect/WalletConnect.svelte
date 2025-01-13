<script lang="ts">
	import WalletConnectSend from '$eth/components/wallet-connect/WalletConnectSend.svelte';
	import WalletConnectSession from '$eth/components/wallet-connect/WalletConnectSession.svelte';
	import WalletConnectSign from '$eth/components/wallet-connect/WalletConnectSign.svelte';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	let listener: OptionWalletConnectListener;
</script>

<WalletConnectSession bind:listener />

<WalletConnectSign bind:listener />

<WalletConnectSend bind:listener />
