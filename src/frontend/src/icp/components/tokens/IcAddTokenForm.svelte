<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import AddTokenByNetworkToolbar from '$icp-eth/components/tokens/AddTokenByNetworkToolbar.svelte';

	export let ledgerCanisterId = '';
	export let indexCanisterId = '';

	let invalid = true;
	$: invalid = isNullishOrEmpty(ledgerCanisterId) || isNullishOrEmpty(indexCanisterId);
</script>

<p class="text-misty-rose my-2">{$i18n.tokens.import.text.info}</p>

<p class="text-blue font-bold mb-4">
	<ExternalLink
		href="https://github.com/dfinity/oisy-wallet/blob/main/HOW-TO.md#custom-icrc-token-integration"
		ariaLabel={$i18n.tokens.import.text.open_github_howto}
	>
		{$i18n.tokens.import.text.github_howto}
	</ExternalLink>
</p>

<div class="stretch">
	<label for="ledgerCanisterId" class="font-bold px-4.5"
		>{$i18n.tokens.import.text.ledger_canister_id}:</label
	>
	<Input
		name="ledgerCanisterId"
		inputType="text"
		required
		bind:value={ledgerCanisterId}
		placeholder="_____-_____-_____-_____-cai"
		spellcheck={false}
	/>

	<label for="indexCanisterId" class="font-bold px-4.5"
		>{$i18n.tokens.import.text.index_canister_id}:</label
	>
	<Input
		name="indexCanisterId"
		inputType="text"
		required
		bind:value={indexCanisterId}
		placeholder="_____-_____-_____-_____-cai"
		spellcheck={false}
	/>
</div>

<AddTokenByNetworkToolbar {invalid} on:icBack />
