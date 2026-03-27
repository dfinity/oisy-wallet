<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { STAKE_PROVIDER_LOGO } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatStakeApyNumber } from '$lib/utils/format.utils';

	interface Props {
		content: Snippet;
		pageTitle?: string;
		pageDescription: string;
		backButton?: Snippet;
		maxApy?: number;
		logo?: string;
	}

	let { logo, pageDescription, content, backButton, pageTitle, maxApy }: Props = $props();
</script>

<StakeContentSection {content}>
	{#snippet title()}
		{#if nonNullish(backButton)}
			<div class="absolute top-0 left-0">
				{@render backButton?.()}
			</div>
		{/if}

		<div class="flex w-full flex-col items-center text-center">
			<Logo alt={pageTitle} size="xl" src={logo} testId={STAKE_PROVIDER_LOGO} />

			<h2 class="my-2 text-xl font-bold sm:text-2xl">
				{pageTitle}
			</h2>

			<div class="text-sm sm:text-base">
				<Html text={pageDescription} />
			</div>
		</div>

		{#if nonNullish(maxApy)}
			<div
				class="absolute top-0 right-0 flex flex-col items-center rounded-lg px-1 py-1 text-center sm:px-3"
				class:bg-secondary={maxApy <= 0}
				class:bg-success-subtle-20={maxApy > 0}
				in:fade
			>
				<span class="text-xs">{$i18n.stake.text.max_apy_label}</span>
				<span
					class="text-sm font-bold"
					class:text-primary={maxApy <= 0}
					class:text-success-primary={maxApy > 0}
				>
					{formatStakeApyNumber(maxApy)}%
				</span>
			</div>
		{/if}
	{/snippet}
</StakeContentSection>
