<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		extCanisterId?: string;
	}

	let { extCanisterId = $bindable() }: Props = $props();
</script>

<p class="mb-6 text-sm">{$i18n.tokens.import.text.info_ext}</p>

<label class="font-bold" for="canisterId">
	{$i18n.tokens.import.text.canister_id}:
	<span class="text-brand-primary-alt">*</span>
</label>
<div>
	<InputText name="canisterId" placeholder="_____-_____-_____-_____-cai" bind:value={extCanisterId} />
</div>
