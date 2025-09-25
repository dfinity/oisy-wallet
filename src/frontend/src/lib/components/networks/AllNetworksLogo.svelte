<script lang="ts">
	import allNetworksIcon from '$lib/assets/networks/all-networks.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		size?: LogoSize;
		color?: 'off-white' | 'white';
		testId?: string;
		transparent?: boolean;
	}

	let { size = 'xxs', color = 'off-white', testId, transparent = false }: Props = $props();
</script>

<div
	style={`max-height: ${logoSizes[size]}`}
	class="rounded-full ring ring-disabled"
	class:bg-primary={!transparent}
>
	<span class="invert-on-dark-theme inline-flex">
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, {
				$name: $i18n.networks.chain_fusion
			})}
			{color}
			{size}
			src={allNetworksIcon}
			testId={`${testId}-default`}
		/>
	</span>
</div>
