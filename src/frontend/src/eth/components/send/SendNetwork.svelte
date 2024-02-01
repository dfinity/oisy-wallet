<script lang="ts">
	import { Dropdown, DropdownItem } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import type { Network } from '$lib/types/network';
	import { ETHEREUM_NETWORK, ICP_NETWORK } from '$lib/constants/networks.constants';
	import { isEthAddress, isIcpAccountIdentifier } from '$lib/utils/account.utils';
	import { isCkEthHelperContract } from '$eth/utils/send.utils';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { getContext } from 'svelte';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';

	export let network: Network | undefined = undefined;
	export let destination: string | undefined = undefined;

	const { sendTokenId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let networkName: string | undefined = network?.name;

	const onDestinationAddressInput = debounce(async () => {
		if (nonNullish(network)) {
			// A network was already manually selected except if disabled, in that case we always recalculate the network based on the provided destination
			return;
		}

		if (isNullish(destination) || destination === '') {
			networkName = undefined;
			return;
		}

		if (
			isCkEthHelperContract({
				destination,
				helperContractAddress: $ckEthHelperContractAddressStore?.[$sendTokenId]
			})
		) {
			networkName = ICP_NETWORK.name;
			return;
		}

		if (isEthAddress(destination)) {
			networkName = ETHEREUM_NETWORK.name;
			return;
		}

		if (isIcpAccountIdentifier(destination)) {
			networkName = ICP_NETWORK.name;
		}
	});

	$: destination, onDestinationAddressInput();

	$: networkName,
		(() => {
			switch (networkName) {
				case undefined:
					network = undefined;
					break;
				case ETHEREUM_NETWORK.name:
					network = ETHEREUM_NETWORK;
					break;
				case ICP_NETWORK.name:
					network = ICP_NETWORK;
					break;
			}
		})();
</script>

<label for="network" class="font-bold px-4.5">Network:</label>

<div id="network" class="mb-4 mt-1 pt-0.5">
	<Dropdown name="network" bind:selectedValue={networkName}>
		<option disabled selected value={undefined} class="hidden"
			><span class="description">Select network</span></option
		>
		<DropdownItem value={ETHEREUM_NETWORK.name}>Ethereum</DropdownItem>

		<DropdownItem value={ICP_NETWORK.name}>Convert to native ICP</DropdownItem>
	</Dropdown>
</div>

<style lang="scss">
	.hidden {
		display: none;
	}
</style>
