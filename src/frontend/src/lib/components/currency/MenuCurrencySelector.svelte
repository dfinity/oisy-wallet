<script lang="ts">
	import CurrencyDropdown from '$lib/components/currency/CurrencyDropdown.svelte';
	import IconDollarSign from '$lib/components/icons/IconDollarSign.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex justify-between pl-3">
	<span class="mr-3 flex min-w-32 items-center text-tertiary">
		<span class="mr-1 flex"><IconDollarSign /></span>
		<span class="flex">{$i18n.core.text.currency}</span>
	</span>

	<CurrencyDropdown />
</div>
