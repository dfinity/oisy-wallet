<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { Network } from '$lib/types/network';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let network: Network;
	export let size: LogoSize = 'xxs';
	export let color: 'off-white' | 'white' = 'off-white';
	export let testId: string | undefined = undefined;
</script>

<div class="dark-hidden block" data-tid={`${testId}-light-container`}>
	<Logo
		src={network.iconLight}
		alt={replacePlaceholders($i18n.core.alt.logo, {
			$name: network.name
		})}
		{size}
		{color}
		testId={`${testId}-light`}
	/>
</div>

<div class="dark-block hidden" data-tid={`${testId}-dark-container`}>
	<Logo
		src={network.iconDark}
		alt={replacePlaceholders($i18n.core.alt.logo, {
			$name: network.name
		})}
		{size}
		{color}
		testId={`${testId}-dark`}
	/>
</div>
