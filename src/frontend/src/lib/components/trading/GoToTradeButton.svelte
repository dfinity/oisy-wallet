<script lang="ts">
	import { goto } from '$app/navigation';
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { TRADING_GOTO_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<Button
	colorStyle="success"
	onclick={() => goto(AppPath.ProvidersOisyTrade)}
	styleClass="gap-1 flex-none px-12 font-semibold"
	testId={TRADING_GOTO_BUTTON}
	type="button"
>
	{$i18n.trading.text.go_to_trade}
	<IconArrowRight />
</Button>
