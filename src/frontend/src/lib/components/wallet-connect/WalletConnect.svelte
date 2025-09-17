<script lang="ts">
	import WalletConnectSend from '$lib/components/wallet-connect/WalletConnectSend.svelte';
	import WalletConnectSession from '$lib/components/wallet-connect/WalletConnectSession.svelte';
	import WalletConnectSign from '$lib/components/wallet-connect/WalletConnectSign.svelte';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	let listener = $state<OptionWalletConnectListener | undefined>();
</script>

<WalletConnectSession bind:listener />

<WalletConnectSign bind:listener />

<WalletConnectSend bind:listener />
