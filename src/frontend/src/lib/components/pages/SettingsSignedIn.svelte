<script lang="ts">
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { KeyValuePairInfo } from '@dfinity/gix-components';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { authRemainingTimeStore, authStore } from '$lib/stores/auth.store';
	import { nonNullish } from '@dfinity/utils';
	import { secondsToDuration } from '@dfinity/utils';
	import type { Principal } from '@dfinity/principal';
	import NetworksTestnetsToggle from '$lib/components/networks/NetworksTestnetsToggle.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import TokensZeroBalanceToggle from '$lib/components/tokens/TokensZeroBalanceToggle.svelte';

	let remainingTimeMilliseconds: number | undefined;
	$: remainingTimeMilliseconds = $authRemainingTimeStore;

	let principal: Principal | undefined | null;
	$: principal = $authStore?.identity?.getPrincipal();
</script>

<KeyValuePairInfo>
	<svelte:fragment slot="key"
		><span class="font-bold">{$i18n.settings.text.principal}:</span></svelte:fragment
	>
	<svelte:fragment slot="value"
		><output class="break-all">{shortenWithMiddleEllipsis(principal?.toText() ?? '')}</output><Copy
			inline
			value={principal?.toText() ?? ''}
			text={$i18n.settings.text.principal_copied}
		/></svelte:fragment
	>
	<svelte:fragment slot="info">
		{replaceOisyPlaceholders($i18n.settings.text.principal_description)}
	</svelte:fragment>
</KeyValuePairInfo>

<div class="mt-4">
	<KeyValuePairInfo>
		<svelte:fragment slot="key"
			><span class="font-bold">{$i18n.settings.text.session}:</span></svelte:fragment
		>
		<output slot="value" class="mr-1.5">
			{#if nonNullish(remainingTimeMilliseconds)}
				{remainingTimeMilliseconds <= 0
					? '0'
					: secondsToDuration({ seconds: BigInt(remainingTimeMilliseconds) / 1000n })}
			{/if}
		</output>

		<svelte:fragment slot="info">
			{$i18n.settings.text.session_description}
		</svelte:fragment>
	</KeyValuePairInfo>
</div>

<div class="mt-2">
	<KeyValuePairInfo>
		<svelte:fragment slot="key"
			><span class="font-bold">{$i18n.settings.text.testnets}:</span></svelte:fragment
		>

		<NetworksTestnetsToggle slot="value" />

		<svelte:fragment slot="info">
			{$i18n.settings.text.testnets_description}
		</svelte:fragment>
	</KeyValuePairInfo>
</div>

<div class="mt-2">
	<KeyValuePairInfo>
		<svelte:fragment slot="key"
			><span class="font-bold">{$i18n.tokens.text.hide_zero_balances}:</span></svelte:fragment
		>

		<TokensZeroBalanceToggle slot="value" />

		<svelte:fragment slot="info">
			{$i18n.settings.text.hide_zero_balances_description}
		</svelte:fragment>
	</KeyValuePairInfo>
</div>
