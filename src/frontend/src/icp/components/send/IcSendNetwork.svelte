<script lang="ts">
	import { Dropdown, DropdownItem } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import type { NetworkId } from '$lib/types/network';
	import { ICP_NETWORK_ID, ICP_NETWORK_SYMBOL } from '$lib/constants/networks.constants';
	import { BTC_NETWORK, BTC_NETWORK_ID, BTC_NETWORK_SYMBOL } from '$icp/constants/ckbtc.constants';
	import { BtcNetwork } from '@dfinity/ckbtc';
	import { isBtcAddress } from '$icp/utils/send.utils';
	import {isIcrcAddress} from "$icp/utils/icrc-account.utils";

	export let networkId: NetworkId | undefined = undefined;
	export let destination: string | undefined = undefined;

	let networkSymbol: string | undefined = undefined;

	const onDestinationAddressInput = debounce(async () => {
		if (nonNullish(networkId)) {
			// A network was already manually selected
			return;
		}

		if (isNullish(destination) || destination === '') {
			return;
		}

		if (
			isBtcAddress({
				address: destination,
				network: BTC_NETWORK
			})
		) {
			networkSymbol = BTC_NETWORK_SYMBOL;
			return;
		}

		if (isIcrcAddress(destination)) {
			networkSymbol = ICP_NETWORK_SYMBOL;
		}
	});

	$: destination, onDestinationAddressInput();

	$: networkSymbol,
		(() => {
			switch (networkSymbol) {
				case BTC_NETWORK_SYMBOL:
					networkId = BTC_NETWORK_ID;
					break;
				case ICP_NETWORK_SYMBOL:
					networkId = ICP_NETWORK_ID;
					break;
			}
		})();
</script>

<label for="network" class="font-bold px-4.5">Network:</label>

<div id="network" class="mb-4 mt-1 pt-0.5">
	<Dropdown name="network" bind:selectedValue={networkSymbol}>
		<option disabled selected value={undefined} class="hidden"
			><span class="description">Select network</span></option
		>
		<DropdownItem value={ICP_NETWORK_SYMBOL}>Internet Computer</DropdownItem>

		<DropdownItem value={BTC_NETWORK_SYMBOL}>
			{#if BTC_NETWORK === BtcNetwork.Mainnet}
				Bitcoin
			{:else if BTC_NETWORK === BtcNetwork.Testnet}
				Bitcoin (Testnet)
			{:else if BTC_NETWORK === BtcNetwork.Regtest}
				Bitcoin (Regtest)
			{/if}
		</DropdownItem>
	</Dropdown>
</div>

<style lang="scss">
	.hidden {
		display: none;
	}
</style>
