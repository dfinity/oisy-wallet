<script lang="ts">
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import InputText from '$lib/components/ui/InputText.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let ledgerCanisterId = '';
	export let indexCanisterId = '';
</script>

<p class="mb-2 mt-1">{replaceOisyPlaceholders($i18n.tokens.import.text.info)}</p>

<p class="mb-4 font-bold text-brand-primary">
	<ExternalLink
		href="https://github.com/dfinity/oisy-wallet/blob/main/HOW-TO.md#custom-icrc-token-integration"
		ariaLabel={$i18n.tokens.import.text.open_github_howto}
	>
		{$i18n.tokens.import.text.github_howto}
	</ExternalLink>
</p>

<div class="stretch">
	<label for="ledgerCanisterId" class="px-4.5 font-bold"
		>{$i18n.tokens.import.text.ledger_canister_id}:</label
	>
	<InputText
		name="ledgerCanisterId"
		bind:value={ledgerCanisterId}
		placeholder="_____-_____-_____-_____-cai"
	/>

	<label for="indexCanisterId" class="px-4.5 font-bold"
		>{$i18n.tokens.import.text.index_canister_id}:</label
	>
	<InputText
		name="indexCanisterId"
		bind:value={indexCanisterId}
		placeholder="_____-_____-_____-_____-cai"
	/>
</div>
