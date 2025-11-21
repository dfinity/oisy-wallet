<script lang="ts">
	import type { Snippet } from 'svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import {
		STAKE_PROVIDER_EXTERNAL_URL,
		STAKE_PROVIDER_LOGO
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { StakeProvider } from '$lib/types/stake';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import CollapsibleList from '$lib/components/ui/CollapsibleList.svelte';

	interface Props {
		provider: StakeProvider;
		data: Snippet[];
	}

	let { provider, data }: Props = $props();
</script>

<div class="my-4 rounded-lg border border-disabled bg-secondary px-2 py-3">
	<div class="flex justify-between">
		<div class="flex items-center gap-3">
			<Logo
				alt={stakeProvidersConfig[provider].name}
				size="xs"
				src={stakeProvidersConfig[provider].logo}
				testId={STAKE_PROVIDER_LOGO}
			/>
			<span class="font-bold">
				{replacePlaceholders($i18n.stake.text.provider, {
					$provider: stakeProvidersConfig[provider].name
				})}
			</span>
		</div>

		<ExternalLink
			ariaLabel={stakeProvidersConfig[provider].name}
			href={stakeProvidersConfig[provider].url}
			iconAsLast
			iconSize="15"
			styleClass="text-sm"
			testId={STAKE_PROVIDER_EXTERNAL_URL}
		>
			{$i18n.stake.text.visit_provider}
		</ExternalLink>
	</div>

	<CollapsibleList items={data} />
</div>
