<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import {
		BTC_MAINNET_TOKEN,
		BTC_REGTEST_TOKEN,
		BTC_TESTNET_TOKEN
	} from '$env/tokens/tokens.btc.env';
	import ReceiveButtonWithModal from '$lib/components/receive/ReceiveButtonWithModal.svelte';
	import ReceiveModal from '$lib/components/receive/ReceiveModal.svelte';
	import { modalBtcReceive } from '$lib/derived/modal.derived';
	import { networkId } from '$lib/derived/network.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import {
		btcAddressMainnetStore,
		btcAddressRegtestStore,
		btcAddressTestnetStore
	} from '$lib/stores/address.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet } from '$lib/utils/network.utils';

	let addressData = $derived(
		isNetworkIdBTCTestnet($networkId)
			? $btcAddressTestnetStore
			: isNetworkIdBTCRegtest($networkId)
				? $btcAddressRegtestStore
				: $btcAddressMainnetStore
	);

	let addressToken = $derived(
		isNetworkIdBTCTestnet($networkId)
			? BTC_TESTNET_TOKEN
			: isNetworkIdBTCRegtest($networkId)
				? BTC_REGTEST_TOKEN
				: BTC_MAINNET_TOKEN
	);

	const isDisabled = (): boolean => isNullish(addressData) || !addressData.certified;

	const openReceive = async (modalId: symbol) => {
		if (isDisabled()) {
			const status = await waitWalletReady(isDisabled);

			if (status === 'timeout') {
				return;
			}
		}

		modalStore.openBtcReceive(modalId);
	};
</script>

<ReceiveButtonWithModal isOpen={$modalBtcReceive} open={openReceive}>
	{#snippet modal()}
		<ReceiveModal
			address={addressData?.data}
			{addressToken}
			copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
			network={addressToken.network}
		/>
	{/snippet}
</ReceiveButtonWithModal>
