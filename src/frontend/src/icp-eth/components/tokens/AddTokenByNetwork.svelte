<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { Dropdown, DropdownItem } from '@dfinity/gix-components';
	import { networksMainnets } from '$lib/derived/networks.derived';
	import { ETHEREUM_NETWORK_SYMBOL, ICP_NETWORK_SYMBOL } from '$env/networks.env';
	import IcAddTokenForm from '$icp/components/tokens/IcAddTokenForm.svelte';
	import AddTokenForm from '$eth/components/tokens/AddTokenForm.svelte';
	import { networkId } from '$lib/derived/network.derived';
	import { isNullish } from '@dfinity/utils';

	export let dropdownNetwork: string | undefined;
	export let tokenData: Record<string, string>;

	let ledgerCanisterId: string = '';
	let indexCanisterId: string = '';
	let contractAddress: string = '';

	$: tokenData = {
		ledgerCanisterId,
		indexCanisterId,
		contractAddress
	};
</script>

{#if isNullish($networkId)}
	<div class="stretch pt-8">
		<label for="selectedNetwork" class="font-bold px-4.5">{$i18n.tokens.manage.text.select_network}:</label>
		<Dropdown name="selectedNetwork" bind:selectedValue={dropdownNetwork}>
			{#each $networksMainnets as network}
				<DropdownItem value={network.id.description ?? ''}>{network.name}</DropdownItem>
			{/each}
		</Dropdown>
	</div>
{/if}

{#if dropdownNetwork === ICP_NETWORK_SYMBOL}
	<IcAddTokenForm on:icBack on:icNext bind:ledgerCanisterId bind:indexCanisterId />
{:else if dropdownNetwork === ETHEREUM_NETWORK_SYMBOL}
	<AddTokenForm on:icBack on:icNext bind:contractAddress />
{/if}
