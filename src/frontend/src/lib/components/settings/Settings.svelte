<script lang="ts">
	import { KeyValuePairInfo, Card } from '@dfinity/gix-components';
	import type { Principal } from '@dfinity/principal';
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import NetworksTestnetsToggle from '$lib/components/networks/NetworksTestnetsToggle.svelte';
	import SettingsVersion from '$lib/components/settings/SettingsVersion.svelte';
	import ThemeSelector from '$lib/components/settings/ThemeSelector.svelte';
	import TokensZeroBalanceToggle from '$lib/components/tokens/TokensZeroBalanceToggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { POUH_ENABLED } from '$lib/constants/credentials.constants';
	import { SETTINGS_ADDRESS_LABEL } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { userHasPouhCredential } from '$lib/derived/has-pouh-credential';
	import { requestPouhCredential } from '$lib/services/request-pouh-credential.services';
	import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import type { OptionIdentity } from '$lib/types/identity';
	import type { Option } from '$lib/types/utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { modalStore } from '$lib/stores/modal.store';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import { modalSettingsData, modalSettingsState } from '$lib/derived/modal.derived';
	import type { SettingsModalType } from '$lib/types/settings';

	let remainingTimeMilliseconds: number | undefined;
	$: remainingTimeMilliseconds = $authRemainingTimeStore;

	let identity: OptionIdentity;
	$: identity = $authIdentity;

	let principal: Option<Principal>;
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

	const openSettingsModal = (t: SettingsModalType) => modalStore.openSettings(t);
</script>

<div class="rounded-xl bg-primary p-5">
	<h4 class="mb-5">General</h4>

	<div class="my-3">
		<KeyValuePairInfo>
			<svelte:fragment slot="key">
				<span>{$i18n.settings.text.principal}</span>
			</svelte:fragment>
			<svelte:fragment slot="value">
				<output class="break-all" data-tid={SETTINGS_ADDRESS_LABEL}>
					{shortenWithMiddleEllipsis({ text: principal?.toText() ?? '' })}
				</output>
				<Copy
					inline
					value={principal?.toText() ?? ''}
					text={$i18n.settings.text.principal_copied}
				/>
			</svelte:fragment>
			<svelte:fragment slot="info">
				{replaceOisyPlaceholders($i18n.settings.text.principal_description)}
			</svelte:fragment>
		</KeyValuePairInfo>
	</div>

	<div class="my-3">
		<KeyValuePairInfo>
			<span class="flex flex-col" slot="key">
				<span>{$i18n.settings.text.session}</span>
				{#if nonNullish(remainingTimeMilliseconds)}
					<span class="text-sm text-tertiary">
						{remainingTimeMilliseconds <= 0
							? '0'
							: secondsToDuration({ seconds: BigInt(remainingTimeMilliseconds) / 1000n })}
					</span>
				{/if}
			</span>
			<output slot="value" class="mr-1.5">
				<Button link on:click={() => openSettingsModal('sessionDuration')} disabled>Edit ></Button>
			</output>

			<svelte:fragment slot="info">
				{$i18n.settings.text.session_description}
			</svelte:fragment>
		</KeyValuePairInfo>
	</div>
</div>

<div class="mt-5 flex-col gap-4 rounded-xl bg-primary p-5">
	<h4 class="mb-5">Networks</h4>

	<div class="my-3">
		<KeyValuePairInfo>
			<svelte:fragment slot="key"><span>{$i18n.settings.text.testnets}</span></svelte:fragment>

			<svelte:fragment slot="value"
				><Button link on:click={() => openSettingsModal('enabledNetworks')}>Edit ></Button
				></svelte:fragment
			>

			<svelte:fragment slot="info">
				{$i18n.settings.text.testnets_description}
			</svelte:fragment>
		</KeyValuePairInfo>
	</div>
</div>

{#if POUH_ENABLED && nonNullish($userProfileStore)}
	<div class="mt-5 flex-col gap-4 rounded-xl bg-primary p-5" in:fade>
		<h4 class="mb-5">{$i18n.settings.text.credentials_title}</h4>

		<div class="mt-4">
			<KeyValuePairInfo>
				<span slot="key">{$i18n.settings.text.pouh_credential}</span>
				<svelte:fragment slot="value">
					{#if $userHasPouhCredential}
						<output in:fade class="mr-1.5">
							{$i18n.settings.text.pouh_credential_verified}
						</output>
					{:else}
						<Button type="button" on:click={getPouhCredential}>
							{$i18n.settings.text.present_pouh_credential}
						</Button>
					{/if}
				</svelte:fragment>

				<svelte:fragment slot="info">
					{$i18n.settings.text.pouh_credential_description}
				</svelte:fragment>
			</KeyValuePairInfo>
		</div>
	</div>
{/if}

<div class="mt-5 flex-col gap-4 rounded-xl bg-primary p-5">
	<h4 class="mb-5">{$i18n.settings.text.appearance}</h4>

	<ThemeSelector />
</div>

<SettingsVersion />

{#if $modalSettingsState}
	<SettingsModal />
{/if}
