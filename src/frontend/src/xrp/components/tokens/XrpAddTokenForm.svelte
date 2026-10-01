<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		issuer?: string;
		currency?: string;
	}

	let { issuer = $bindable(), currency = $bindable() }: Props = $props();
</script>

<label class="font-bold" for="xrpIssuer">{$i18n.tokens.import.text.xrp_issuer}:</label>
<InputText
	name="xrpIssuer"
	placeholder={$i18n.tokens.placeholder.enter_xrp_issuer}
	bind:value={issuer}
/>

<label class="mt-6 block font-bold" for="xrpCurrency"
	>{$i18n.tokens.import.text.xrp_currency_code}:</label
>
<InputText
	name="xrpCurrency"
	placeholder={$i18n.tokens.placeholder.enter_xrp_currency_code}
	bind:value={currency}
/>
