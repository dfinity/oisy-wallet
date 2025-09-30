<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import { TOKEN_MODAL_INDEX_CANISTER_ID_INPUT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let ledgerCanisterId = '';
	export let indexCanisterId = '';
	export let editMode = false;
</script>

<p class="mb-6 text-sm">{$i18n.tokens.import.text.info}</p>

<label class="font-bold" for="ledgerCanisterId"
	>{$i18n.tokens.import.text.ledger_canister_id}:
	<span class="text-brand-primary-alt">*</span></label
>
<div style={`${editMode ? '--input-background: var(--color-background-disabled);' : ''}`}>
	<InputText
		name="ledgerCanisterId"
		disabled={editMode}
		placeholder="_____-_____-_____-_____-cai"
		bind:value={ledgerCanisterId}
	/>
</div>

<label class="mt-6 block font-bold" for="indexCanisterId"
	>{$i18n.tokens.import.text.index_canister_id}:</label
>
<InputText
	name="indexCanisterId"
	placeholder="_____-_____-_____-_____-cai"
	required={false}
	testId={TOKEN_MODAL_INDEX_CANISTER_ID_INPUT}
	bind:value={indexCanisterId}
/>

<p class="mb-6 mt-2 text-sm">{replaceOisyPlaceholders($i18n.tokens.import.text.info_index)}</p>
