<script lang="ts">
	import ActiveLoansCard from '$lib/components/borrow/ActiveLoansCard.svelte';
	import BorrowingPowerCard from '$lib/components/borrow/BorrowingPowerCard.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_BORROW_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<StakeContentSection>
	{#snippet title()}
		<h3 class="w-full text-center">
			{$i18n.borrow.text.header_title}
		</h3>
	{/snippet}
	{#snippet content()}
		<p class="w-full text-center">
			{$i18n.borrow.text.header_description}
			<ExternalLink ariaLabel={$i18n.core.alt.learn_more} href={OISY_BORROW_URL} iconAsLast>
				{$i18n.core.text.learn_more}
			</ExternalLink>
		</p>

		<div class="mt-4 flex w-full flex-col gap-3 sm:flex-row">
			<BorrowingPowerCard />
			<ActiveLoansCard />
		</div>
	{/snippet}
</StakeContentSection>
