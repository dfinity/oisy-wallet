<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import IconChevronDown from '$lib/components/icons/IconChevronDown.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import IconMorePlain from '$lib/components/icons/IconMorePlain.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import NetworksTestnetsToggle from '$lib/components/networks/NetworksTestnetsToggle.svelte';
	import { testnetsStore } from '$lib/stores/settings.store';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import chainFusion from '$lib/assets/chain_fusion.svg';
	import ChainFusionButton from '$lib/components/networks/ChainFusionButton.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const close = () => (visible = false);

	let testnets: boolean;
	$: testnets = $testnetsStore?.enabled ?? false;
</script>

<button
	class="token icon desktop-wide"
	bind:this={button}
	on:click={() => (visible = true)}
	aria-label={$i18n.networks.title}
>
	<div class="w-full h-full md:w-[28px] md:h-[28px]">
		<Img
			src={$selectedNetwork?.icon ?? chainFusion}
			alt={replacePlaceholders($i18n.core.alt.logo, {
				$name: $selectedNetwork?.name ?? $i18n.networks.chain_fusion
			})}
			width="100%"
			height="100%"
			rounded
		/>
	</div>
	<span class="text-black font-bold"
		>{$selectedNetwork?.name ?? $i18n.networks.chain_fusion} <IconChevronDown /></span
	>
</button>

<Popover bind:visible anchor={button} direction="rtl">
	<ul class="flex flex-col gap-4 list-none">
		<li>
			<ChainFusionButton isTestnet={false} on:icSelected={close} />
		</li>

		{#each $networksMainnets as network}
			<li>
				<Network {network} on:icSelected={close} />
			</li>
		{/each}
	</ul>

	<div class="flex justify-between items-center mt-8 mb-4">
		<span class="font-bold px-4.5">{$i18n.networks.show_testnets}</span>
		<NetworksTestnetsToggle />
	</div>

	{#if testnets}
		<ul
			class="flex flex-col gap-4 list-none mb-2"
			transition:slide={{ easing: quintOut, axis: 'y' }}
		>
			{#each $networksTestnets as network}
				<li>
					<Network {network} on:icSelected={close} />
				</li>
			{/each}
		</ul>
	{/if}

	<hr class="bg-dark-blue opacity-10 my-4 w-10/12" style="border: 0.05rem solid" />

	<ul class="flex flex-col gap-4 list-none">
		<li class="flex justify-between items-center">
			<div class="flex gap-2 items-center">
				<IconMorePlain />
				<span class="text-grey">{$i18n.networks.more}</span>
			</div>
		</li>
	</ul>
</Popover>
