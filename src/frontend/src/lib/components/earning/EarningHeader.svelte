<script>
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import EarningPotentialCard from '$lib/components/earning/EarningPotentialCard.svelte';
	import EarningPositionCard from '$lib/components/earning/EarningPositionCard.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants.js';
</script>

<StakeContentSection>
	{#snippet title()}
		<h3 class="w-full text-center">
			{$i18n.earning.text.header_title}
		</h3>
	{/snippet}
	{#snippet content()}
		<p class="w-full text-center">
			{$i18n.earning.text.header_description}
			<ExternalLink iconAsLast href={OISY_DOCS_URL} ariaLabel={$i18n.core.alt.learn_more}>
				{$i18n.core.text.learn_more}
			</ExternalLink>
		</p>

		<div class="flex w-full flex-col gap-3 sm:flex-row">
			<EarningPotentialCard />
			<EarningPositionCard />
		</div>
	{/snippet}
</StakeContentSection>
