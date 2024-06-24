<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';

	export let contractAddress = '';
</script>

<div class="stretch">
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
