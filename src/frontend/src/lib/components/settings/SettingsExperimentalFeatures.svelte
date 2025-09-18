<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { updateUserExperimentalFeatureSettings } from '$lib/api/backend.api';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_AI_ASSISTANT_DOCS_URL } from '$lib/constants/oisy.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { userExperimentalFeatures } from '$lib/derived/user-experimental-features.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store.js';
	import { toastsShow } from '$lib/stores/toasts.store';
	import type {
		ExperimentalFeatureId,
		UserExperimentalFeatures
	} from '$lib/types/user-experimental-features';
	import { emit } from '$lib/utils/events.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';

	const features: ExperimentalFeatureId[] = ['AiAssistantBeta'];

	let loading = $state(false);

	const save = async (features: UserExperimentalFeatures) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		loading = true;

		await updateUserExperimentalFeatureSettings({
			identity: $authIdentity,
			experimentalFeatures: features,
			currentUserVersion: $userProfileVersion
		});

		emit({ message: 'oisyRefreshUserProfile' });

		loading = false;

		toastsShow({
			text: $i18n.settings.text.save_beta_feature_success,
			level: 'success',
			duration: 2000
		});
	};

	const labelsByFeatureId: Record<ExperimentalFeatureId, Record<string, string>> = {
		AiAssistantBeta: {
			title: replaceOisyPlaceholders($i18n.ai_assistant.text.title),
			description: $i18n.ai_assistant.text.feature_description,
			learnMore: OISY_AI_ASSISTANT_DOCS_URL
		}
	};
</script>

<SettingsCard>
	<svelte:fragment slot="title">{$i18n.settings.text.beta_features}</svelte:fragment>

	{#each features as feature (feature)}
		<SettingsCardItem>
			<svelte:fragment slot="key">
				{labelsByFeatureId[feature].title}
			</svelte:fragment>

			<svelte:fragment slot="value">
				<Toggle
					ariaLabel={$userExperimentalFeatures?.[feature].enabled
						? $i18n.settings.text.disable_beta_feature
						: $i18n.settings.text.enable_beta_feature}
					checked={$userExperimentalFeatures?.[feature].enabled ?? false}
					disabled={loading}
					on:nnsToggle={async () => {
						await save({
							[feature]: {
								...$userExperimentalFeatures?.[feature],
								enabled: !$userExperimentalFeatures?.[feature].enabled
							}
						});
					}}
				/>
			</svelte:fragment>
			<svelte:fragment slot="info">
				<span>
					{labelsByFeatureId[feature].description}

					{#if nonNullish(labelsByFeatureId[feature].learnMore)}
						<ExternalLink
							ariaLabel={$i18n.rewards.text.learn_more}
							href={labelsByFeatureId[feature].learnMore}
							iconVisible={false}>{$i18n.rewards.text.learn_more}</ExternalLink
						>
					{/if}
				</span>
			</svelte:fragment>
		</SettingsCardItem>
	{/each}
</SettingsCard>
