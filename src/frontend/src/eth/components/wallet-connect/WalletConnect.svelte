<script lang="ts">
	import WalletConnectSend from './WalletConnectSend.svelte';
	import WalletConnectSession from './WalletConnectSession.svelte';
	import WalletConnectSign from './WalletConnectSign.svelte';
	import type { OptionWalletConnectListener } from '$eth/types/wallet-connect';

	let listener: OptionWalletConnectListener;
</script>

<WalletConnectSession bind:listener />

<WalletConnectSign bind:listener />

<WalletConnectSend bind:listener />
