<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { NavigationTarget } from '@sveltejs/kit';
	import { afterNavigate } from '$app/navigation';
	import IconArrowDown from '$lib/components/icons/lucide/IconArrowDown.svelte';
	import IconBackArrow from '$lib/components/icons/lucide/IconBackArrow.svelte';
	import LiquidiumSummary from '$lib/components/liquidium/LiquidiumSummary.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
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
		portfolio: LiquidiumPortfolio | null;
		showSummary?: boolean;
		onLearnMore: () => void;
	}

	let {
		logo,
		pageTitle,
		pageDescription,
		portfolio,
		showSummary = true,
		onLearnMore
	}: Props = $props();

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

			<Button innerStyleClass="items-center" link onclick={onLearnMore} styleClass="mt-2 text-sm">
				<span>{$i18n.core.text.learn_more}</span>
				<IconArrowDown size="18" />
			</Button>
		</div>
	{/snippet}

	{#snippet content()}
		{#if showSummary}
			<LiquidiumSummary {portfolio} />
		{/if}
	{/snippet}
</StakeContentSection>
