<script lang="ts">
	import { TargetNetwork } from '$lib/enums/network';
	import { Dropdown, DropdownItem } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { isIcpAccountIdentifier } from '$lib/utils/send.utils';
	import { isAddress } from '@ethersproject/address';

	export let network: TargetNetwork | undefined = undefined;
	export let destination: string | undefined = undefined;

	const onDestinationAddressInput = debounce(() => {
		if (nonNullish(network)) {
			// A network was already manually selected
			return;
		}

		if (isNullish(destination) || destination === '') {
			return;
		}

		if (isAddress(destination)) {
			network = TargetNetwork.ETHEREUM;
			return;
		}

		if (isIcpAccountIdentifier(destination)) {
			network = TargetNetwork.ICP;
		}
	});

	$: destination, onDestinationAddressInput();
</script>

<label class="font-bold px-1.25">Network:</label>

<div class="mb-2 mt-0.5 pt-0.25">
	<Dropdown name="network" bind:selectedValue={network}>
		<option disabled selected value={undefined} class="hidden"
			><span class="description">Select network</span></option
		>
		<DropdownItem value={TargetNetwork.ETHEREUM}>Ethereum</DropdownItem>

		<DropdownItem value={TargetNetwork.ICP}>Convert to native ICP</DropdownItem>
	</Dropdown>
</div>

<style lang="scss">
	.hidden {
		display: none;
	}
</style>
