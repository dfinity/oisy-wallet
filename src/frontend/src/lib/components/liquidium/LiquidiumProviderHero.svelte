<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import LiquidiumSummary from '$lib/components/liquidium/LiquidiumSummary.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { STAKE_PROVIDER_LOGO } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumPortfolio } from '$lib/types/liquidium';
	import { back } from '$lib/utils/nav.utils';

	interface Props {
		logo: string;
		pageTitle: string;
		pageDescription: string;
		url: string;
		portfolio: LiquidiumPortfolio | null;
		showSummary?: boolean;
	}

	let { logo, pageTitle, pageDescription, url, portfolio, showSummary = true }: Props = $props();

	let fromRoute = $state<NavigationTarget | null>(null);

	afterNavigate(({ from }) => {
		fromRoute = from;
	});
</script>

<StakeContentSection>
	{#snippet title()}
		<div class="absolute top-0 left-0">
			<ButtonIcon
				ariaLabel={$i18n.core.text.back}
				colorStyle="tertiary"
				link={false}
				onclick={() => back({ pop: nonNullish(fromRoute) })}
			>
				{#snippet icon()}
					<IconBackArrow />
				{/snippet}
			</ButtonIcon>
		</div>

		<div class="flex w-full flex-col items-center text-center">
			<Logo alt={pageTitle} size="xl" src={logo} testId={STAKE_PROVIDER_LOGO} />

			<h2 class="my-2 text-xl font-bold sm:text-2xl">
				{pageTitle}
			</h2>

			<div class="text-sm sm:text-base">
				<Html text={pageDescription} />
			</div>
		</div>

		{#if showSummary}
			<div class="absolute top-0 right-0">
				<ExternalLink
					ariaLabel={$i18n.core.text.learn_more}
					color="blue"
					href={url}
					iconAsLast
					styleClass="text-sm"
				>
					{$i18n.core.text.learn_more}
				</ExternalLink>
			</div>
		{/if}
	{/snippet}

	{#snippet content()}
		{#if showSummary}
			<LiquidiumSummary {portfolio} />
		{/if}
	{/snippet}
</StakeContentSection>
