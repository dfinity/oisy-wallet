<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Copy from '$lib/components/ui/Copy.svelte';
	import WalletConnectModalValue from '$lib/components/wallet-connect/WalletConnectModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		data?: string;
		label: string;
	}

	let { data, label }: Props = $props();
</script>

{#if nonNullish(data)}
	<WalletConnectModalValue {label} ref="data">
		{shortenWithMiddleEllipsis({ text: data })}<Copy
			inline
			text={$i18n.wallet_connect.text.raw_copied}
			value={data}
		/>
	</WalletConnectModalValue>
{/if}
