<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let ledgerCanisterId = '';
	export let indexCanisterId = '';
</script>

<p class="mb-6">{$i18n.tokens.import.text.info}</p>

<label for="ledgerCanisterId" class="font-bold"
	>{$i18n.tokens.import.text.ledger_canister_id}:
	<span class="text-brand-primary-alt">*</span></label
>
<InputText
	name="ledgerCanisterId"
	bind:value={ledgerCanisterId}
	placeholder="_____-_____-_____-_____-cai"
/>

<label for="indexCanisterId" class="mt-6 block font-bold"
	>{$i18n.tokens.import.text.index_canister_id}:</label
>
<InputText
	name="indexCanisterId"
	bind:value={indexCanisterId}
	placeholder="_____-_____-_____-_____-cai"
	required={false}
/>

<p class="mb-6">{replaceOisyPlaceholders($i18n.tokens.import.text.info_index)}</p>
