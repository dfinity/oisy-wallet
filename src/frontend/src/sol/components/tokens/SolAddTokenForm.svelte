<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let tokenAddress = '';
</script>

<label for="destination" class="font-bold">{$i18n.tokens.text.token_address}:</label>
<InputText
	name="tokenAddress"
	bind:value={tokenAddress}
	placeholder={$i18n.tokens.placeholder.enter_token_address}
/>
