<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconAddressTypeBtc from '$lib/components/icons/IconAddressTypeBtc.svelte';
	import IconAddressTypeEth from '$lib/components/icons/IconAddressTypeEth.svelte';
	import IconAddressTypeIcrc2 from '$lib/components/icons/IconAddressTypeIcrcv2.svelte';
	import IconAddressTypeSol from '$lib/components/icons/IconAddressTypeSol.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { Network } from '$lib/types/network';
	import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		network: Network;
		size?: LogoSize;
		color?: 'off-white' | 'white' | 'transparent';
		addressType?: TokenAccountIdTypes;
		testId?: string;
	}

	let { network, size = 'xxs', color = 'off-white', addressType, testId }: Props = $props();
</script>

{#if color === 'transparent' && nonNullish(addressType)}
	<div data-tid={`${testId}-transparent`}>
		{#if addressType === 'Icrcv2'}
			<IconAddressTypeIcrc2 size="16" />
		{:else if addressType === 'Btc'}
			<IconAddressTypeBtc size="16" />
		{:else if addressType === 'Eth'}
			<IconAddressTypeEth size="16" />
		{:else if addressType === 'Sol'}
			<IconAddressTypeSol size="16" />
		{/if}
	</div>
{:else}
	<div class="dark-hidden block" data-tid={`${testId}-light-container`}>
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: network.name })}
			{size}
			src={network.iconLight}
			testId={`${testId}-light`}
		/>
	</div>

	<div class="dark-block hidden" data-tid={`${testId}-dark-container`}>
		<Logo
			alt={replacePlaceholders($i18n.core.alt.logo, { $name: network.name })}
			{size}
			src={network.iconDark}
			testId={`${testId}-dark`}
		/>
	</div>
{/if}
