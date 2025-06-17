<script lang="ts">
	import EarningCategoryCard from '$lib/components/earning/EarningCategoryCard.svelte';
	import IconCrypto from '$lib/components/icons/IconCrypto.svelte';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { i18n } from '$lib/stores/i18n.store.js';
</script>

<div class="flex flex-col">
	<PageTitle>{$i18n.earning.text.title}</PageTitle>

	<!-- Todo: refactor this once the design is clear -->
	<!-- we know we want to show these 3 cards, thats why the translations have been added already -->

	<div class="grid grid-cols-3 gap-3">
		<EarningCategoryCard appPath={AppPath.EarningGold}>
			{#snippet icon()}
				<IconCrypto />
			{/snippet}
			{#snippet title()}
				{$i18n.earning.cards.gold_title}
			{/snippet}
			{#snippet description()}
				{$i18n.earning.cards.gold_description}
			{/snippet}
		</EarningCategoryCard>
		<EarningCategoryCard appPath={AppPath.EarningRewards}>
			{#snippet icon()}
				<IconGift />
			{/snippet}
			{#snippet title()}
				{$i18n.earning.cards.sprinkles_title}
			{/snippet}
			{#snippet description()}
				{$i18n.earning.cards.sprinkles_description}
			{/snippet}
		</EarningCategoryCard>
		<EarningCategoryCard disabled>
			{#snippet icon()}
				<IconCrypto />
			{/snippet}
			{#snippet title()}
				{$i18n.earning.cards.stablecoins_title}
			{/snippet}
			{#snippet description()}
				{$i18n.earning.cards.stablecoins_description}
			{/snippet}
		</EarningCategoryCard>
	</div>
</div>
