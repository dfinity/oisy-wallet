<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { getRecentlyToppedUpCanisters } from '$icp/utils/cycles-top-up.utils';
	import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { CYCLES_TOP_UP_RECENT_CANISTER } from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		formatSecondsToNormalizedDate,
		shortenWithMiddleEllipsis
	} from '$lib/utils/format.utils';

	interface Props {
		// The page's TCYCLES token, whose loaded history lists the top-ups.
		token: IcToken;
		onSelect: (canisterId: string) => void;
	}

	let { token, onSelect }: Props = $props();

	let canisters = $derived(
		getRecentlyToppedUpCanisters(($icTransactionsStore?.[token.id] ?? []).map(({ data }) => data))
	);

	let currentDate = $state(new Date());
</script>

{#if canisters.length > 0}
	<div class="mt-6">
		<p class="mb-2 font-bold">{$i18n.cycles_top_up.text.recently_topped_up}</p>

		<ul class="flex list-none flex-col gap-1">
			{#each canisters as { canisterId, value, timestamp } (canisterId)}
				<li data-tid={CYCLES_TOP_UP_RECENT_CANISTER}>
					<LogoButton onClick={() => onSelect(canisterId)}>
						{#snippet logo()}
							<div class="mr-2">
								<AvatarWithBadge
									address={canisterId}
									badge={{ type: 'addressType', address: canisterId }}
									variant="sm"
								/>
							</div>
						{/snippet}

						{#snippet title()}
							<span class="text-base">{shortenWithMiddleEllipsis({ text: canisterId })}</span>
						{/snippet}

						{#snippet description()}
							{#if nonNullish(value)}
								<Amount amount={value} decimals={token.decimals} symbol={token.symbol} />
							{/if}
						{/snippet}

						{#snippet descriptionEnd()}
							{#if nonNullish(timestamp)}
								{formatSecondsToNormalizedDate({
									seconds: normalizeTimestampToSeconds(timestamp),
									currentDate,
									language: $currentLanguage
								})}
							{/if}
						{/snippet}
					</LogoButton>
				</li>
			{/each}
		</ul>
	</div>
{/if}
