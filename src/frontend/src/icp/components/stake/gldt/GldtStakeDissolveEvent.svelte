<script lang="ts">
	import type { DissolveStakeEvent } from '$declarations/gldt_stake/gldt_stake.did';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import {
		formatCurrency,
		formatSecondsToDate,
		formatTimestampToDaysDifference,
		formatToken
	} from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { calculateTokenUsdAmount, getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		gldtToken: Token;
		event: DissolveStakeEvent;
	}

	let { gldtToken, event }: Props = $props();

	let dissolvedDateTimestamp = $derived(Number(event.dissolved_date));

	let formattedAmount = $derived(
		formatToken({
			value: event.amount,
			unitName: gldtToken.decimals
		})
	);
</script>

<div
	class="mb-3 flex w-full items-center justify-between border-b border-tertiary pb-3 last:mb-0 last:border-b-0"
>
	<div class="flex items-center sm:w-1/3">
		<div class="mr-2 sm:mr-4">
			<Responsive up="md">
				<TokenLogo badge={{ type: 'network' }} color="white" data={gldtToken} />
			</Responsive>
			<Responsive down="sm">
				<TokenLogo badge={{ type: 'network' }} color="white" data={gldtToken} logoSize="xs" />
			</Responsive>
		</div>

		<div class="flex flex-col text-sm">
			<span class="font-bold">{getTokenDisplaySymbol(gldtToken)}</span>

			<span class="text-tertiary">
				{gldtToken.name}
			</span>
		</div>
	</div>

	<div class="flex flex-col items-center sm:w-1/3">
		{#if dissolvedDateTimestamp <= Date.now()}
			<Tag variant="success">{$i18n.stake.text.unlocked}</Tag>
		{:else}
			<Tag variant="warning">
				{replacePlaceholders($i18n.stake.text.unlocking_in, {
					$time: formatTimestampToDaysDifference({
						timestamp: dissolvedDateTimestamp,
						language: $currentLanguage
					})
				})}
			</Tag>
		{/if}
		<span class="mt-0.5 text-sm text-tertiary">
			{formatSecondsToDate({
				seconds: dissolvedDateTimestamp / 1000,
				language: $currentLanguage,
				formatOptions: {
					year: undefined
				}
			})}
		</span>
	</div>

	<div class="flex flex-col text-right sm:w-1/3">
		<span class="text-sm font-bold sm:text-lg">{formattedAmount}</span>
		<span class="text-sm text-tertiary">
			{formatCurrency({
				value:
					calculateTokenUsdAmount({
						amount: event.amount,
						token: gldtToken,
						$exchanges
					}) ?? 0,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		</span>
	</div>
</div>
