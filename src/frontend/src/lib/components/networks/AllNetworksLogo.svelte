<script lang="ts">
	import allNetworksIconDark from '$lib/assets/networks/dark/all-networks.svg';
	import allNetworksIconLight from '$lib/assets/networks/light/all-networks.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		size?: LogoSize;
		color?: 'off-white' | 'white';
		testId?: string;
	}

	let { size = 'xxs', color = 'off-white', testId }: Props = $props();
</script>

<div class="dark-hidden block">
	<Logo
		alt={replacePlaceholders($i18n.core.alt.logo, {
			$name: $i18n.networks.chain_fusion
		})}
		{color}
		{size}
		src={allNetworksIconLight}
		testId={`${testId}-light`}
	/>
</div>

<div class="dark-block hidden">
	<Logo
		alt={replacePlaceholders($i18n.core.alt.logo, {
			$name: $i18n.networks.chain_fusion
		})}
		{color}
		{size}
		src={allNetworksIconDark}
		testId={`${testId}-dark`}
	/>
</div>
