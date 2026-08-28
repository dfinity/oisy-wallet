<script lang="ts">
	import AddressActions from '$lib/components/ui/AddressActions.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Network } from '$lib/types/network';
	import type { SolAddress } from '$sol/types/address';
	import { solAccountExplorerUrl } from '$sol/utils/sol-explorer.utils';

	interface Props {
		address: SolAddress;
		network: Network | undefined;
		testId?: string;
	}

	let { address, network, testId }: Props = $props();

	let explorerUrl = $derived(solAccountExplorerUrl({ network, address }));
</script>

<AddressActions
	copyAddress={address}
	copyAddressTestId={testId}
	copyAddressText={$i18n.wallet.text.address_copied}
	externalLink={explorerUrl}
	externalLinkAriaLabel={$i18n.wallet_connect.alt.open_address_block_explorer}
/>
