<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import AddTokenByNetworkToolbar from '$icp-eth/components/tokens/AddTokenByNetworkToolbar.svelte';

	export let contractAddress = '';

	let invalid = true;
	$: invalid = isNullishOrEmpty(contractAddress);
</script>

<div class="stretch pt-2">
	<label for="destination" class="font-bold px-4.5">{$i18n.tokens.text.contract_address}:</label>
	<Input
		name="contractAddress"
		inputType="text"
		required
		bind:value={contractAddress}
		placeholder={$i18n.tokens.placeholder.enter_contract_address}
		spellcheck={false}
	/>
</div>

<AddTokenByNetworkToolbar {invalid} on:icBack />
