<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import TokensZeroBalanceToggle from '$lib/components/tokens/TokensZeroBalanceToggle.svelte';
</script>

<span class="block text-sm text-blue">{$i18n.tokens.text.balance}</span>

<div class="flex justify-between items-center">
	<span class="px-4.5">{$i18n.tokens.text.hide_zero_balances}</span>
	<TokensZeroBalanceToggle />
</div>
