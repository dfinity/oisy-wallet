<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import IconChevronDown from '$lib/components/icons/IconChevronDown.svelte';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import Img from '$lib/components/ui/Img.svelte';
	import IconMore from '$lib/components/icons/IconMore.svelte';
	import Network from '$lib/components/networks/Network.svelte';
	import { ETHEREUM_NETWORK, ICP_NETWORK } from '$lib/constants/networks.constants';

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
		<Img src={ETHEREUM_TOKEN.icon} alt={`${ETHEREUM_TOKEN.name} logo`} width="100%" height="100%" />
	</div>
	<span class="text-black font-bold">{ETHEREUM_TOKEN.name} <IconChevronDown /></span>
</button>

<Popover bind:visible anchor={button} direction="rtl">
	<ul class="flex flex-col gap-4 list-none">
		<li>
			<Network network={ETHEREUM_NETWORK} on:icSelected={close} />
		</li>

		<li>
			<Network network={ICP_NETWORK} on:icSelected={close} />
		</li>

		<li class="flex justify-between items-center">
			<div class="flex gap-2 items-center">
				<IconMore />
				<span class="text-grey">More coming soon</span>
			</div>
		</li>
	</ul>
</Popover>
