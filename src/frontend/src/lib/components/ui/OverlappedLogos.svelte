<script lang="ts">
	import { fade } from 'svelte/transition';
	import Logo from '$lib/components/ui/Logo.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import type { LogoSize } from '$lib/types/components';

	interface Props {
		icons: string[];
		size?: LogoSize;
		color?: 'off-white' | 'white';
		styleClass?: string;
		invertColor?: boolean;
	}

	let { icons, size = 'xxs', invertColor, color = 'off-white', styleClass = '' }: Props = $props();
</script>

<div class={`${styleClass} flex items-center`}>
	{#if icons.length > 0}
		{#each icons as icon, i (icon)}
			<div
				style={`max-height: ${logoSizes[size]}; ${i < icons.length - 1 ? `margin-right: calc(-${logoSizes[size]} / 3);` : ''} z-index: ${i + 1};`}
				class="bg-primary ring-disabled relative rounded-full ring"
				in:fade
			>
				<span class="inline-flex" class:invert-on-dark-theme={invertColor}>
					<Logo alt={`${icon}-${i}`} {color} {size} src={icon} />
				</span>
			</div>
		{/each}
	{:else}
		<div class="w-12">
			<SkeletonText />
		</div>
	{/if}
</div>
