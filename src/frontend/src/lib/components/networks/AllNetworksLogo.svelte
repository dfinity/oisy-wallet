<script lang="ts">
	import allNetworksIconDark from '$lib/assets/networks/dark/all-networks.svg';
	import allNetworksIconLight from '$lib/assets/networks/light/all-networks.svg';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let size: LogoSize = 'xxs';
	export let color: 'off-white' | 'white' = 'off-white';
	export let testId: string | undefined = undefined;
</script>

<div class="dark-hidden block">
	<Logo
		src={allNetworksIconLight}
		alt={replacePlaceholders($i18n.core.alt.logo, {
			$name: $i18n.networks.chain_fusion
		})}
		{size}
		{color}
		testId={`${testId}-light`}
	/>
</div>

<div class="dark-block hidden">
	<Logo
		src={allNetworksIconDark}
		alt={replacePlaceholders($i18n.core.alt.logo, {
			$name: $i18n.networks.chain_fusion
		})}
		{size}
		{color}
		testId={`${testId}-dark`}
	/>
</div>
