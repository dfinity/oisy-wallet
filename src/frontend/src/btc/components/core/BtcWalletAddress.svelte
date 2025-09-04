<script lang="ts">
	import Copy from '$lib/components/ui/Copy.svelte';
	import {
		btcAddressMainnet,
		btcAddressTestnet,
		btcAddressRegtest
	} from '$lib/derived/address.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet } from '$lib/utils/network.utils';

	const address = isNetworkIdBTCTestnet($networkId)
		? $btcAddressTestnet
		: isNetworkIdBTCRegtest($networkId)
			? $btcAddressRegtest
			: $btcAddressMainnet;
</script>

<div class="p-3">
	<label class="block text-sm font-bold" for="btc-wallet-address"
		>{$i18n.wallet.text.wallet_address}:</label
	>

	<output id="btc-wallet-address" class="break-all"
		>{shortenWithMiddleEllipsis({ text: address ?? '' })}</output
	><Copy inline text={$i18n.wallet.text.address_copied} value={address ?? ''} />
</div>
