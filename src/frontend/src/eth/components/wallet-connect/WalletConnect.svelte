<script lang="ts">
	import WalletConnectSession from './WalletConnectSession.svelte';
	import WalletConnectSign from './WalletConnectSign.svelte';
	import type { WalletConnectListener } from '$lib/types/wallet-connect';
	import WalletConnectSend from './WalletConnectSend.svelte';

	let listener: WalletConnectListener | undefined | null;
</script>

<WalletConnectSession bind:listener />

<WalletConnectSign bind:listener />

<WalletConnectSend bind:listener />
