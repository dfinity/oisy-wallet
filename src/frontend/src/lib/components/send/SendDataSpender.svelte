<script lang="ts">
	import type { Snippet } from 'svelte';
	import ContactOrToken from '$lib/components/contact/ContactOrToken.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		spender: string;
		// An NFT operator is this same row with different authority behind it: no allowance, every
		// token in the collection. It is labelled for what it is rather than as a spender.
		label?: string;
		ref?: string;
		// Copy and block-explorer controls for the address. A snippet rather than a network, so the
		// component stays chain-agnostic and each review supplies the links its chain has.
		actions?: Snippet;
	}

	let { spender, label, ref = 'spender', actions }: Props = $props();

	let labelText = $derived(label ?? $i18n.wallet_connect.text.spender);
</script>

<WalletConnectModalValue label={labelText} {ref}>
	<div class="flex flex-col gap-1">
		<span class="flex flex-wrap items-center gap-2">
			{spender}

			{@render actions?.()}
		</span>
		<ContactOrToken identifier={spender} />
	</div>
</WalletConnectModalValue>
