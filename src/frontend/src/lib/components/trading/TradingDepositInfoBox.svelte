<script lang="ts">
	import IconRepeat from '$lib/components/icons/IconRepeat.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_TRADE_LEARN_MORE_URL } from '$lib/constants/oisy-trade.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="rounded-lg bg-secondary p-3">
	<div class="flex items-center justify-between gap-2">
		<span class="flex items-center gap-2 text-sm font-bold">
			<IconRepeat size="16" />
			{$i18n.trading.deposit.info_title}
		</span>
		<ExternalLink
			ariaLabel={$i18n.trading.text.learn_more}
			color="blue"
			href={OISY_TRADE_LEARN_MORE_URL}
			iconSize="14"
		>
			{$i18n.trading.text.learn_more}
		</ExternalLink>
	</div>
	<p class="mt-2 text-sm text-tertiary">{$i18n.trading.deposit.info_description}</p>
</div>
