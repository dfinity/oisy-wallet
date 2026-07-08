<script lang="ts">
	import { goto } from '$app/navigation';
	import GoToButton from '$lib/components/common/GoToButton.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { TRADING_GOTO_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<GoToButton
	label={$i18n.trading.text.go_to_trade}
	onclick={() => goto(AppPath.ProvidersOisyTrade)}
	testId={TRADING_GOTO_BUTTON}
/>
