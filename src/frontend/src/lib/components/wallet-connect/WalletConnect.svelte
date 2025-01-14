<script lang="ts">
	import WalletConnectSend from '$eth/components/wallet-connect/WalletConnectSend.svelte';
	import WalletConnectSign from '$eth/components/wallet-connect/WalletConnectSign.svelte';
	import WalletConnectSession from '$lib/components/wallet-connect/WalletConnectSession.svelte';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	let listener: OptionWalletConnectListener;
</script>

<WalletConnectSession bind:listener />

<WalletConnectSign bind:listener />

<WalletConnectSend bind:listener />
