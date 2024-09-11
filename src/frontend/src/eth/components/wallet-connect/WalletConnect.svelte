<script lang="ts">
	import WalletConnectSend from './WalletConnectSend.svelte';
	import WalletConnectSession from './WalletConnectSession.svelte';
	import WalletConnectSign from './WalletConnectSign.svelte';
	import type { OptionalNullableWalletConnectListener } from '$eth/types/wallet-connect';

	let listener: OptionalNullableWalletConnectListener;
</script>

<WalletConnectSession bind:listener />

<WalletConnectSign bind:listener />

<WalletConnectSend bind:listener />
