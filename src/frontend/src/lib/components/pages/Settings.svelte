<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { KeyValuePairInfo } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { authRemainingTimeStore, authStore } from '$lib/stores/auth.store';
	import { nonNullish } from '@dfinity/utils';
	import { secondsToDuration } from '@dfinity/utils';
	import type { Principal } from '@dfinity/principal';
	import TokensMetadata from '$lib/components/tokens/TokensMetadata.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import NetworksTestnetsToggle from '$lib/components/networks/NetworksTestnetsToggle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let remainingTimeMilliseconds: number | undefined;
	$: remainingTimeMilliseconds = $authRemainingTimeStore;

	let principal: Principal | undefined | null;
	$: principal = $authStore?.identity?.getPrincipal();
</script>

<KeyValuePairInfo>
	<svelte:fragment slot="key"
		><span class="font-bold">{$i18n.settings.principal}:</span></svelte:fragment
	>
	<svelte:fragment slot="value"
		><output class="break-all">{shortenWithMiddleEllipsis(principal?.toText() ?? '')}</output><Copy
			inline
			value={principal?.toText() ?? ''}
			text={$i18n.settings.principal_copied}
		/></svelte:fragment
	>
	<svelte:fragment slot="info">
		{replacePlaceholders($i18n.settings.principal_description, {
			[`{OISY_NAME}`]: OISY_NAME
		})}
	</svelte:fragment>
</KeyValuePairInfo>

<div class="mt-4">
	<KeyValuePairInfo>
		<svelte:fragment slot="key"
			><span class="font-bold">{$i18n.settings.session}:</span></svelte:fragment
		>
		<output slot="value" class="mr-1.5">
			{#if nonNullish(remainingTimeMilliseconds)}
				{remainingTimeMilliseconds <= 0
					? '0'
					: secondsToDuration({ seconds: BigInt(remainingTimeMilliseconds) / 1000n })}
			{/if}
		</output>

		<svelte:fragment slot="info">
			{$i18n.settings.session_description}
		</svelte:fragment>
	</KeyValuePairInfo>
</div>

<div class="mt-4">
	<KeyValuePairInfo>
		<svelte:fragment slot="key"
			><span class="font-bold">{$i18n.settings.testnets}:</span></svelte:fragment
		>

		<NetworksTestnetsToggle slot="value" />

		<svelte:fragment slot="info">
			{$i18n.settings.testnets_description}
		</svelte:fragment>
	</KeyValuePairInfo>
</div>

<TokensMetadata />
