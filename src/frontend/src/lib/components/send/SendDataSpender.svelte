<script lang="ts">
	import ContactOrToken from '$lib/components/contact/ContactOrToken.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		spender: string;
		// An NFT operator is this same row with different authority behind it: no allowance, every
		// token in the collection. It is labelled for what it is rather than as a spender.
		label?: string;
		ref?: string;
	}

	let { spender, label, ref = 'spender' }: Props = $props();

	let labelText = $derived(label ?? $i18n.wallet_connect.text.spender);
</script>

<WalletConnectModalValue label={labelText} {ref}>
	<div class="flex flex-col gap-1">
		{spender}
		<ContactOrToken identifier={spender} />
	</div>
</WalletConnectModalValue>
