<script lang="ts">
	import type { Snippet } from 'svelte';
	import CollapsibleList from '$lib/components/ui/CollapsibleList.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import {
		STAKE_PROVIDER_EXTERNAL_URL,
		STAKE_PROVIDER_LOGO
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { StakeProvider } from '$lib/types/stake';

	interface Props {
		provider: StakeProvider;
		terms: Snippet[];
		showAllTerms?: boolean;
	}

	let { provider, terms, showAllTerms = false }: Props = $props();
</script>

<div class="border-disabled bg-secondary my-4 rounded-lg border px-2 py-3">
	<div class="flex justify-between">
		<div class="flex items-center gap-3">
			<Logo
				alt={stakeProvidersConfig[provider].name}
				size="xs"
				src={stakeProvidersConfig[provider].logo}
				testId={STAKE_PROVIDER_LOGO}
			/>
			<span class="font-bold">
				{stakeProvidersConfig[provider].description}
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

	<CollapsibleList hideExpandButton={showAllTerms} items={terms} />
</div>
