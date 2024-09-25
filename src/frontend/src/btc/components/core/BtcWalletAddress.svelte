<script lang="ts">
	import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet } from '$icp/utils/ic-send.utils.js';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { btcAddressMainnet, btcAddressTestnet } from '$lib/derived/address.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	// Regtest and Testnet BTC wallets have the same address
	const address =
		isNetworkIdBTCTestnet($networkId) || isNetworkIdBTCRegtest($networkId)
			? $btcAddressTestnet
			: $btcAddressMainnet;
</script>

<div>
	<label class="block text-sm font-bold" for="btc-wallet-address"
		>{$i18n.wallet.text.wallet_address}:</label
	>

	<output id="btc-wallet-address" class="break-all"
		>{shortenWithMiddleEllipsis({ text: address ?? '' })}</output
	><Copy color="inherit" inline value={address ?? ''} text={$i18n.wallet.text.address_copied} />
</div>
