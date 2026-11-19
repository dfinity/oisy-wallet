<script lang="ts">
	import CyclesTopUpRecentCanister from '$icp/components/cycles-top-up/CyclesTopUpRecentCanister.svelte';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { getRecentlyToppedUpCanisters } from '$icp/utils/cycles-top-up.utils';
	import { CYCLES_TOP_UP_RECENT_CANISTER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		// The page's TCYCLES token, whose loaded history lists the top-ups.
		token: IcToken;
		onSelect: (canisterId: string) => void;
	}

	let { token, onSelect }: Props = $props();

	let canisters = $derived(
		getRecentlyToppedUpCanisters(($icTransactionsStore?.[token.id] ?? []).map(({ data }) => data))
	);
</script>

{#if canisters.length > 0}
	<div class="mt-6">
		<p class="mb-2 font-bold">{$i18n.cycles_top_up.text.recently_topped_up}</p>

		<ul class="flex list-none flex-col gap-1">
			{#each canisters as { canisterId, value, timestamp } (canisterId)}
				<li data-tid={CYCLES_TOP_UP_RECENT_CANISTER}>
					<CyclesTopUpRecentCanister {canisterId} {onSelect} {timestamp} {token} {value} />
				</li>
			{/each}
		</ul>
	</div>
{/if}
