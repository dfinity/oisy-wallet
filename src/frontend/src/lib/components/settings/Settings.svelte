<script lang="ts">
	import type { Principal } from '@dfinity/principal';
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import EnabledNetworksPreviewIcons from '$lib/components/settings/EnabledNetworksPreviewIcons.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import SettingsVersion from '$lib/components/settings/SettingsVersion.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import { POUH_ENABLED } from '$lib/constants/credentials.constants';
	import {
		SETTINGS_ACTIVE_NETWORKS_EDIT_BUTTON,
		SETTINGS_ADDRESS_LABEL
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { userHasPouhCredential } from '$lib/derived/has-pouh-credential';
	import {
		type SettingsModalType,
		SettingsModalType as SettingsModalEnum
	} from '$lib/enums/settings-modal-types';
	import { requestPouhCredential } from '$lib/services/request-pouh-credential.services';
	import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { busy } from '$lib/stores/busy.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { userProfileStore } from '$lib/stores/user-profile.store';
	import type { OptionIdentity } from '$lib/types/identity';
	import type { Option } from '$lib/types/utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	let remainingTimeMilliseconds: number | undefined = $derived($authRemainingTimeStore);

	let identity: OptionIdentity = $derived($authIdentity);

	let principal: Option<Principal> = $derived(identity?.getPrincipal());

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

	const modalId = Symbol();

	const openSettingsModal = (t: SettingsModalType) =>
		modalStore.openSettings({ id: modalId, data: t });
</script>

<SettingsCard>
	{#snippet title()}
		General
	{/snippet}

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.settings.text.principal}
		{/snippet}
		{#snippet value()}
			<output class="break-all" data-tid={SETTINGS_ADDRESS_LABEL}>
				{shortenWithMiddleEllipsis({ text: principal?.toText() ?? '' })}
			</output>
			<Copy inline text={$i18n.settings.text.principal_copied} value={principal?.toText() ?? ''} />
		{/snippet}
		{#snippet info()}
			{replaceOisyPlaceholders($i18n.settings.text.principal_description)}
		{/snippet}
	</SettingsCardItem>

	<SettingsCardItem permanentInfo>
		{#snippet key()}
			{$i18n.settings.text.session_duration}
		{/snippet}

		{#snippet info()}
			{#if nonNullish(remainingTimeMilliseconds)}
				{$i18n.settings.text.session_expires_in}
				{remainingTimeMilliseconds <= 0
					? '0'
					: secondsToDuration({
							seconds: BigInt(remainingTimeMilliseconds) / 1000n,
							i18n: $i18n.temporal.seconds_to_duration
						})}
			{/if}
		{/snippet}
	</SettingsCardItem>
</SettingsCard>

<SettingsCard>
	{#snippet title()}
		{$i18n.settings.text.networks}
	{/snippet}

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.settings.text.active_networks}
		{/snippet}
		{#snippet value()}
			<EnabledNetworksPreviewIcons />

			<Button
				link
				onclick={() => openSettingsModal(SettingsModalEnum.ENABLED_NETWORKS)}
				testId={SETTINGS_ACTIVE_NETWORKS_EDIT_BUTTON}
			>
				{$i18n.core.text.edit} >
			</Button>
		{/snippet}
		{#snippet info()}
			{replaceOisyPlaceholders($i18n.settings.text.active_networks_description)}
		{/snippet}
	</SettingsCardItem>
</SettingsCard>

{#if POUH_ENABLED && nonNullish($userProfileStore)}
	<SettingsCard>
		{#snippet title()}
			{$i18n.settings.text.credentials_title}
		{/snippet}

		<SettingsCardItem>
			{#snippet key()}
				{$i18n.settings.text.pouh_credential}
			{/snippet}
			{#snippet value()}
				{#if $userHasPouhCredential}
					<output class="mr-1.5" in:fade>
						{$i18n.settings.text.pouh_credential_verified}
					</output>
				{:else}
					<Button link onclick={getPouhCredential}>
						{$i18n.settings.text.present_pouh_credential}&hellip;
					</Button>
				{/if}
			{/snippet}
			{#snippet info()}
				{$i18n.settings.text.pouh_credential_description}
			{/snippet}
		</SettingsCardItem>
	</SettingsCard>
{/if}

<SettingsVersion />
