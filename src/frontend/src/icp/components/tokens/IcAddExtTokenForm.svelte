<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		canisterId?: string;
		editMode?: boolean;
	}

	let {
		canisterId = $bindable(),
		editMode = false
	}: Props = $props();
</script>

<p class="mb-6 text-sm">{$i18n.tokens.import.text.info_ext}</p>

<label class="font-bold" for="canisterId">
	{$i18n.tokens.import.text.canister_id}:
	<span class="text-brand-primary-alt">*</span>
</label>
<div style={`${editMode ? '--input-background: var(--color-background-disabled);' : ''}`}>
	<InputText
		name="canisterId"
		disabled={editMode}
		placeholder="_____-_____-_____-_____-cai"
		bind:value={canisterId}
	/>
</div>

