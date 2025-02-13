<script lang="ts">
	import TokensZeroBalanceToggle from '$lib/components/tokens/TokensZeroBalanceToggle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="content">
	<span class="text-sm block text-brand-primary">{$i18n.tokens.text.balance}</span>

	<div class="flex items-center justify-between">
		<span>{$i18n.tokens.text.hide_zero_balances}</span>
		<TokensZeroBalanceToggle />
	</div>
</div>
