<script lang="ts">
	import { fade } from 'svelte/transition';
	import Logo from '$lib/components/ui/Logo.svelte';
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

<!-- An empty `icons` list renders nothing: absence of icons is not a loading state, so callers
     that need a loading placeholder own that themselves rather than relying on this component. -->
<div class={`${styleClass} flex items-center`}>
	{#each icons as icon, i (icon)}
		<div
			style={`max-height: ${logoSizes[size]}; ${i < icons.length - 1 ? `margin-right: calc(-${logoSizes[size]} / 3);` : ''} z-index: ${i + 1};`}
			class="relative rounded-full bg-primary ring ring-disabled"
			in:fade
		>
			<span class="inline-flex" class:invert-on-dark-theme={invertColor}>
				<Logo alt={`${icon}-${i}`} {color} {size} src={icon} />
			</span>
		</div>
	{/each}
</div>
