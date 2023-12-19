<script lang="ts">
	import { IconCheck, Popover } from '@dfinity/gix-components';
	import IconChevronDown from '$lib/components/icons/IconChevronDown.svelte';
	import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
	import Img from '$lib/components/ui/Img.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import IconMore from '$lib/components/icons/IconMore.svelte';

	let visible = false;
	let button: HTMLButtonElement | undefined;
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
		<li class="flex justify-between items-center">
			<div class="flex gap-2 items-center">
				<Logo
					src={ETHEREUM_TOKEN.icon}
					size="20px"
					alt={`${ETHEREUM_TOKEN.name} logo`}
					color="off-white"
				/>
				<span>{ETHEREUM_TOKEN.name}</span>
			</div>

			<IconCheck size="20px" />
		</li>

		<li class="flex justify-between items-center">
			<div class="flex gap-2 items-center">
				<IconMore />
				<span class="text-grey">More coming soon</span>
			</div>
		</li>
	</ul>
</Popover>
