<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import IconChevronDown from '$lib/components/icons/IconChevronDown.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import { networks, selectedNetwork } from '$lib/derived/network.derived';
	import { nonNullish } from '@dfinity/utils';

	let visible = false;
	let button: HTMLButtonElement | undefined;

	const close = () => (visible = false);
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
		{#each $networks as network}
			<li>
				<Network {network} on:icSelected={close} />
			</li>
		{/each}

		<li class="flex justify-between items-center">
			<div class="flex gap-2 items-center">
				<IconMore />
				<span class="text-grey">More coming soon</span>
			</div>
		</li>
	</ul>
</Popover>
