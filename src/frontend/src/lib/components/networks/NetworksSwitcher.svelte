<script lang="ts">
	import { slide } from 'svelte/transition';
	import chainFusion from '$lib/assets/chain_fusion.svg';
	import IconMorePlain from '$lib/components/icons/IconMorePlain.svelte';
	import MainnetNetwork from '$lib/components/networks/MainnetNetwork.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import NetworkButton from '$lib/components/networks/NetworkButton.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { NETWORKS_SWITCHER_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { SLIDE_EASING } from '$lib/constants/transition.constants';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import { testnetsEnabled } from '$lib/derived/settings.derived';
	import { enabledMainnetTokensUsdBalancesPerNetwork } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';

	export let disabled = false;

	let dropdown: Dropdown | undefined;

	let mainnetTokensUsdBalance: number;
	$: mainnetTokensUsdBalance = $networksMainnets.reduce(
		(acc, { id }) => acc + ($enabledMainnetTokensUsdBalancesPerNetwork[id] ?? 0),
		0
	);
</script>

<Dropdown
	bind:this={dropdown}
	ariaLabel={$i18n.networks.title}
	testId={NETWORKS_SWITCHER_DROPDOWN}
	{disabled}
>
	{$selectedNetwork?.name ?? $i18n.networks.chain_fusion}

	<div slot="items">
		<ul class="flex list-none flex-col font-normal">
			<li>
				<NetworkButton
					id={undefined}
					name={$i18n.networks.chain_fusion}
					icon={chainFusion}
					usdBalance={mainnetTokensUsdBalance}
					on:icSelected={dropdown.close}
				/>
			</li>

			{#each $networksMainnets as network}
				<li>
					<MainnetNetwork {network} on:icSelected={dropdown.close} />
				</li>
			{/each}
		</ul>

		<span class="mb-5 mt-8 flex px-3 font-bold">{$i18n.networks.test_networks}</span>

		{#if $testnetsEnabled}
			<ul class="mb-2 flex list-none flex-col font-normal" transition:slide={SLIDE_EASING}>
				{#each $networksTestnets as network}
					<li>
						<Network {network} on:icSelected={dropdown.close} />
					</li>
				{/each}
			</ul>
		{/if}

		<hr class="mx-3 w-11/12 opacity-10" style="border: 0.05rem solid" />

		<ul class="flex list-none flex-col gap-4 font-normal">
			<li class="flex items-center justify-between">
				<div class="dropdown-item disabled flex items-center gap-2">
					<IconMorePlain />
					<span class="text-grey">{$i18n.networks.more}</span>
				</div>
			</li>
		</ul>
	</div>
</Dropdown>
