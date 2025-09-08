<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { Network } from '$lib/types/network';
	import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		network: Network;
		size?: LogoSize;
		color?: 'off-white' | 'white';
		addressType?: TokenAccountIdTypes;
		testId?: string;
	}

	let { network, size = 'xxs', color = 'off-white', addressType, testId }: Props = $props();
</script>

{#if nonNullish(addressType)}
	<div data-tid={`${testId}-transparent`}>
		<IconAddressType {addressType} {color} size="24" />
	</div>
{:else}
	<div class="dark-hidden block" data-tid={`${testId}-light-container`}>
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, {
				$name: network.name
			})}
			{color}
			{size}
			src={network.iconLight}
			testId={`${testId}-light`}
		/>
	</div>

	<div class="dark-block hidden" data-tid={`${testId}-dark-container`}>
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, {
				$name: network.name
			})}
			{color}
			{size}
			src={network.iconDark}
			testId={`${testId}-dark`}
		/>
	</div>
{/if}
