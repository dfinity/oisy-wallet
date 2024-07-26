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
	import { userHasPouhCredential } from '$lib/derived/has-pouh-credential';
	import { requestPouhCredential } from '$lib/services/request-pouh-credential.services';
	import { fade } from 'svelte/transition';
	import { busy } from '$lib/stores/busy.store';
	import { POUH_ENABLED } from '$lib/constants/credentials.constants';
	import type { OptionIdentity } from '$lib/types/identity';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import { userProfileStore } from '$lib/stores/settings.store';
	import { authSignedIn } from '$lib/derived/auth.derived';

	let remainingTimeMilliseconds: number | undefined;
	$: remainingTimeMilliseconds = $authRemainingTimeStore;

	let identity: OptionIdentity;
	$: identity = $authStore?.identity;

	let principal: Principal | undefined | null;
	$: principal = identity?.getPrincipal();

	const getPouhCredential = async () => {
		if (nonNullish(identity)) {
			try {
				busy.show();
				await requestPouhCredential({ identity });
			} finally {
				busy.stop();
			}
		}
	};

	$: {
		if ($authSignedIn && POUH_ENABLED) {
			loadUserProfile({ identity });
		}
	}
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

{#if POUH_ENABLED && nonNullish($userProfileStore)}
	<div class="mt-8" in:fade>
		<h2 class="text-base mb-6 pb-1">{$i18n.settings.text.credentials_title}</h2>

		<div class="mt-4">
			<KeyValuePairInfo>
				<span slot="key" class="font-bold">{$i18n.settings.text.pouh_credential}:</span>
				<svelte:fragment slot="value">
					{#if $userHasPouhCredential}
						<output in:fade class="mr-1.5">
							{$i18n.settings.text.pouh_credential_verified}
						</output>
					{:else}
						<button type="button" class="secondary" on:click={getPouhCredential}
							>{$i18n.settings.text.present_pouh_credential}</button
						>
					{/if}
				</svelte:fragment>

				<svelte:fragment slot="info">
					{$i18n.settings.text.pouh_credential_description}
				</svelte:fragment>
			</KeyValuePairInfo>
		</div>
	</div>
{/if}
