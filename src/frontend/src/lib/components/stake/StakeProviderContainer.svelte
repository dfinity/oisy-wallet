<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import { STAKE_PROVIDER_LOGO } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { StakeProvider } from '$lib/types/stake';
	import { resolveText, replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		provider: StakeProvider;
		content: Snippet;
		backButton?: Snippet;
		currentApy?: number;
	}

	let { provider, content, backButton, currentApy }: Props = $props();
</script>

<StakeContentSection {content}>
	{#snippet title()}
		{#if nonNullish(backButton)}
			<div class="absolute top-0 left-0">
				{@render backButton?.()}
			</div>
		{/if}

		<div class="flex w-full flex-col items-center text-center">
			<Logo
				alt={stakeProvidersConfig[provider].name}
				size="xl"
				src={stakeProvidersConfig[provider].logo}
				testId={STAKE_PROVIDER_LOGO}
			/>

			<h2 class="my-2 text-xl font-bold sm:text-2xl">
				{replacePlaceholders($i18n.stake.text.stake_page_title, {
					$provider: stakeProvidersConfig[provider].name
				})}
			</h2>

			<div class="text-sm sm:text-base">
				{resolveText({ i18n: $i18n, path: stakeProvidersConfig[provider].pageDescriptionKey })}
			</div>
		</div>

		{#if nonNullish(currentApy)}
			<div
				class="absolute top-0 right-0 flex flex-col items-center rounded-lg bg-success-subtle-20 px-1 py-1 text-center sm:px-3"
				in:fade
			>
				<span class="text-xs">{$i18n.stake.text.current_apy_label}</span>
				<span class="text-sm font-bold text-success-primary">{currentApy}%</span>
			</div>
		{/if}
	{/snippet}
</StakeContentSection>
