<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let contractAddress = '';
</script>

<label for="destination" class="font-bold">{$i18n.tokens.text.contract_address}:</label>
<InputText
	name="contractAddress"
	bind:value={contractAddress}
	placeholder={$i18n.tokens.placeholder.enter_contract_address}
/>
