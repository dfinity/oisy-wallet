<script lang="ts">
	import WalletConnectSend from '$lib/components/wallet-connect/WalletConnectSend.svelte';
	import WalletConnectSession from '$lib/components/wallet-connect/WalletConnectSession.svelte';
	import WalletConnectSign from '$lib/components/wallet-connect/WalletConnectSign.svelte';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

</script>

<WalletConnectSession  />

<WalletConnectSign  />

<WalletConnectSend  />
