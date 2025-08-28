<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let tokenAddress = '';
</script>

<label class="font-bold" for="destination">{$i18n.tokens.text.token_address}:</label>
<InputText
	name="tokenAddress"
	placeholder={$i18n.tokens.placeholder.enter_token_address}
	bind:value={tokenAddress}
/>
