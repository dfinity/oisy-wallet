<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import IconChevronDown from '$lib/components/icons/IconChevronDown.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { nonNullish } from '@dfinity/utils';
	import { networksMainnets, networksTestnets } from '$lib/derived/networks.derived';
	import NetworksTestnetsToggle from '$lib/components/networks/NetworksTestnetsToggle.svelte';
	import { testnetsStore } from '$lib/stores/testnets.store';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

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
	aria-label="Settings, sign-out and external links"
>
	<div class="w-full h-full md:w-[28px] md:h-[28px]">
		{#if nonNullish($selectedNetwork.icon)}
			<Img
				src={$selectedNetwork.icon}
				alt={`${$selectedNetwork.name} logo`}
				width="100%"
				height="100%"
			/>
		{/if}
	</div>
	<span class="text-black font-bold">{$selectedNetwork.name} <IconChevronDown /></span>
</button>

<Popover bind:visible anchor={button} direction="rtl">
	<ul class="flex flex-col gap-4 list-none">
		{#each $networksMainnets as network}
			<li>
				<Network {network} on:icSelected={close} />
			</li>
		{/each}
	</ul>

	<div class="testnets flex justify-between items-center mt-8 mb-4" class:enabled={testnets}>
		<span class="font-bold px-4.5">Show test networks</span>
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
				<IconMore />
				<span class="text-grey">More networks coming soon...</span>
			</div>
		</li>
	</ul>
</Popover>

<style lang="scss">
	.testnets {
		:global(div.toggle) {
			zoom: 1.45;

			--card-background-contrast: var(--color-dust);
			--card-background: var(--color-blue);
		}

		&.enabled {
			:global(div.toggle) {
				--card-background-contrast: var(--color-blue);
				--card-background: var(--color-white);
			}
		}
	}
</style>
