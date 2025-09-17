<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { NFTS_ENABLED } from '$env/nft.env';
	import type { IcToken } from '$icp/types/ic-token';
	import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import NftSettingsMenu from '$lib/components/nfts/NftSettingsMenu.svelte';
	import NftSortMenu from '$lib/components/nfts/NftSortMenu.svelte';
	import NftsList from '$lib/components/nfts/NftsList.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensFilter from '$lib/components/tokens/TokensFilter.svelte';
	import TokensList from '$lib/components/tokens/TokensList.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { ICP_SWAP_POOL_FEE } from '$lib/constants/swap.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalManageTokens, modalManageTokensData } from '$lib/derived/modal.derived';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { TokenTypes } from '$lib/enums/token-types';
	import {
		type DirectedEdge,
		edgesForPair,
		findTriangularArbs,
		fmtAmount,
		formatRationalSig,
		pickTestInput,
		type PoolState,
		simulateCycleVerbose
	} from '$lib/services/av.services';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		tab?: TokenTypes;
	}

	let { tab = TokenTypes.TOKENS }: Props = $props();

	let activeTab = $state(tab);

	let { initialSearch, message } = $derived(
		nonNullish($modalManageTokensData)
			? $modalManageTokensData
			: { initialSearch: undefined, message: undefined }
	);

	const icTokens = $derived(
		$enabledFungibleNetworkTokens.filter(({ standard }) => standard === 'icrc')
	);

	const run = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		// icTokens already narrowed to ICRC via your $derived
		const tokens: IcToken[] = icTokens as IcToken[];

		// 1) fetch per-pair data
		const pairFetches: Array<Promise<{ edges: DirectedEdge[]; state: PoolState } | null>> = [];
		for (let i = 0; i < tokens.length; i++) {
			for (let j = i + 1; j < tokens.length; j++) {
				pairFetches.push(
					edgesForPair({
						identity: $authIdentity,
						tokenA: tokens[i],
						tokenB: tokens[j],
						fee: ICP_SWAP_POOL_FEE
					})
				);
			}
		}

		const results = await Promise.all(pairFetches);
		const edges = results.flatMap((r) => (r ? r.edges : []));
		const states = results.flatMap((r) => (r ? [r.state] : []));

		// 2) scan for triangular arbitrage (small-trade approximation)å
		const arbs = findTriangularArbs(edges, /* epsilon ppm */ 2000); // 0.2% cushion

		// 3) do whatever suits your app:
		// - return them
		// - or log concise candidates to probe with slippage-aware sizing
		if (arbs.length === 0) {
			console.log('No arbitrage cycles found.');
		} else {
			// Build pool state map
			const poolById = new Map<string, PoolState>();
			for (const s of states) {
				poolById.set(s.id, s);
			}

			console.log('Arbitrage candidates (slippage-aware simulation on small notional):');
			for (const arb of arbs) {
				const startSym = arb.cycle[0];
				const firstPool = poolById.get(arb.pools[0]);
				if (!firstPool) {
					console.log(`Skipping ${arb.cycle.join(' → ')} (missing pool state)`);
					continue;
				}

				const { units: testInUnits, decimals: startDec } = pickTestInput(firstPool, startSym);
				const sim = simulateCycleVerbose(arb.cycle, arb.pools, testInUnits, poolById);

				if (!sim.ok) {
					console.log(`Cycle ${arb.cycle.join(' → ')} | ERROR: ${sim.logs.join(' | ')}`);
					continue;
				}

				const gainUnits = sim.finalUnits - testInUnits;
				const gainPct =
					Number(gainUnits) === 0
						? 0
						: (Number(sim.finalUnits - testInUnits) / Number(testInUnits)) * 100;

				console.log(`\nCycle ${arb.cycle.join(' → ')}`);
				console.log(`Start: ${fmtAmount(testInUnits, startDec)} ${startSym}`);
				sim.logs.forEach((line) => console.log(`  - ${line}`));
				console.log(
					`End:   ${fmtAmount(sim.finalUnits, startDec)} ${startSym} ` +
						`(Δ = ${fmtAmount(gainUnits, startDec)} ${startSym}, ${gainPct.toFixed(4)}%)`
				);
			}
		}
	};

	let timer = $state<NodeJS.Timeout | undefined>();

	onMount(() => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			run();
		}, 5000);
	});

	onDestroy(() => clearTimeout(timer));
</script>

<div>
	<StickyHeader>
		<div class="flex w-full justify-between">
			<div class="grow-1 relative flex justify-between">
				<TokensFilter>
					{#snippet overflowableContent()}
						{#if NFTS_ENABLED}
							<Tabs
								styleClass="mt-2 mb-8"
								tabVariant="menu"
								tabs={[
									{ label: $i18n.tokens.text.title, id: TokenTypes.TOKENS, path: AppPath.Tokens },
									{ label: $i18n.nfts.text.title, id: TokenTypes.NFTS, path: AppPath.Nfts }
								]}
								bind:activeTab
							/>
						{:else}
							<Header><span class="mt-2 flex">{$i18n.tokens.text.title}</span></Header>
						{/if}
					{/snippet}
				</TokensFilter>
			</div>
			{#if tab === TokenTypes.TOKENS}
				<div class="flex">
					<TokensMenu />
				</div>
			{:else}
				<div class="flex">
					<NftSortMenu />
				</div>
				<div class="flex">
					<NftSettingsMenu />
				</div>
			{/if}
		</div>
	</StickyHeader>

	{#if activeTab === TokenTypes.TOKENS}
		<TokensList />
	{:else}
		<NftsList />
	{/if}

	<div class="mb-4 mt-12 flex w-full justify-center sm:w-auto" in:fade>
		<ManageTokensButton />
	</div>
</div>

{#if $modalManageTokens}
	<ManageTokensModal {initialSearch}>
		{#snippet infoElement()}
			{#if nonNullish(message)}
				<MessageBox level="info">
					{message}
				</MessageBox>
			{/if}
		{/snippet}
	</ManageTokensModal>
{/if}
