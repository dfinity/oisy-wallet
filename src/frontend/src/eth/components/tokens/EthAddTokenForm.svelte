<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		contractAddress?: string;
	}

	let { contractAddress = $bindable('') }: Props = $props();
</script>

<label class="font-bold" for="destination">{$i18n.tokens.text.contract_address}:</label>
<InputText
	name="contractAddress"
	placeholder={$i18n.tokens.placeholder.enter_contract_address}
	bind:value={contractAddress}
/>
