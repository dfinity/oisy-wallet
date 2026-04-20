<script lang="ts">
	import { nonNullish, secondsToDuration } from '@dfinity/utils';
	import { AI_ASSISTANT_CONSOLE_ENABLED } from '$env/ai-assistant.env';
	import EnabledNetworksPreviewIcons from '$lib/components/settings/EnabledNetworksPreviewIcons.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import SettingsExperimentalFeatures from '$lib/components/settings/SettingsExperimentalFeatures.svelte';
	import SettingsVersion from '$lib/components/settings/SettingsVersion.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import {
		SETTINGS_ACTIVE_NETWORKS_EDIT_BUTTON,
		SETTINGS_ADDRESS_LABEL
	} from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		type SettingsModalType,
		SettingsModalType as SettingsModalEnum
	} from '$lib/enums/settings-modal-types';
	import { authRemainingTimeStore } from '$lib/stores/auth.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const modalId = Symbol();

	const openSettingsModal = (t: SettingsModalType) =>
		modalStore.openSettings({ id: modalId, data: t });
</script>

<SettingsCard>
	{#snippet title()}{$i18n.settings.text.general}{/snippet}

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.settings.text.principal}
		{/snippet}

		{#snippet value()}
			{@const principalText = $authIdentity?.getPrincipal()?.toText()}

			<output class="break-all" data-tid={SETTINGS_ADDRESS_LABEL}>
				{shortenWithMiddleEllipsis({ text: principalText ?? '' })}
			</output>
			<Copy inline text={$i18n.settings.text.principal_copied} value={principalText ?? ''} />
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
			{@const remainingTimeMilliseconds = $authRemainingTimeStore}

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
	{#snippet title()}{$i18n.settings.text.networks}{/snippet}

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

{#if AI_ASSISTANT_CONSOLE_ENABLED}
	<SettingsExperimentalFeatures />
{/if}

<SettingsVersion />
