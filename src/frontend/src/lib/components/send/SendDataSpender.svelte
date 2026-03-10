<script lang="ts">
	import ContactOrToken from '$lib/components/contact/ContactOrToken.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		spender: string;
	}

	let { spender }: Props = $props();
</script>

<WalletConnectModalValue label={$i18n.wallet_connect.text.spender} ref="spender">
	<div class="flex flex-col gap-1">
		{spender}
		<ContactOrToken identifier={spender} />
	</div>
</WalletConnectModalValue>
