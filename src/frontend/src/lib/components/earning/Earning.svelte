<script lang="ts">
	import EarningCategoryCard from '$lib/components/earning/EarningCategoryCard.svelte';
	import IconCrypto from '$lib/components/icons/IconCrypto.svelte';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import { AppPath } from '$lib/constants/routes.constants.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import EarningOpportunityCard from '$lib/components/earning/EarningOpportunityCard.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { GLDX_TOKEN } from '$env/tokens/tokens-spl/tokens.gldx.env';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { tokens } from '$lib/derived/tokens.derived';
	import { isGLDTToken } from '$icp-eth/utils/token.utils';

	const listItemStyles = 'first:text-tertiary last:text-primary last:font-bold';

	const gldt = $derived($tokens.find(isGLDTToken));
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

	<StakeContentSection>
		{#snippet title()}
			Earning opportunities
		{/snippet}
		{#snippet content()}
			<div class="flex flex-col gap-3 md:flex-row">
				<EarningOpportunityCard>
					{#snippet logo()}
						{#if gldt}
							<Logo src={gldt.icon} size="lg" />
						{/if}
					{/snippet}
					{#snippet badge()}
						Current APY <span class="ml-1 font-bold text-success-primary">8.5%</span>
					{/snippet}
					{#snippet title()}
						GLDT Staking
					{/snippet}
					{#snippet description()}
						<p>Stake Gldt tokens to earn rewards backed by physical gold</p>

						<List condensed itemStyleClass="flex-col md:flex-col">
							<ListItem>
								<span class={listItemStyles}>APY</span>
								<span class={listItemStyles}>8.5%</span>
							</ListItem>
						</List>
					{/snippet}
					{#snippet button()}
						<Button colorStyle="primary" fullWidth paddingSmall>Stake GLDT</Button>
					{/snippet}
				</EarningOpportunityCard>
				<EarningOpportunityCard>
					{#snippet logo()}
						<Logo src={GLDX_TOKEN.icon} size="lg" />
					{/snippet}
					{#snippet badge()}
						Current APY <span class="ml-1 font-bold text-success-primary">8.5%</span>
					{/snippet}
					{#snippet title()}
						GLDT Staking
					{/snippet}
					{#snippet description()}
						<p>Stake Gldt tokens to earn rewards backed by physical gold</p>
						<p>Stake Gldt tokens to earn rewards backed by physical gold</p>

						<List condensed itemStyleClass="flex-col md:flex-col">
							<ListItem>
								<span class={listItemStyles}>APY</span>
								<span class={listItemStyles}>8.5%</span>
							</ListItem>
							<ListItem>
								<span class={listItemStyles}>Staked</span>
								<span class={listItemStyles}>99.8 GLDT</span>
							</ListItem>
						</List>
					{/snippet}
					{#snippet button()}
						<Button colorStyle="success" fullWidth paddingSmall>Stake GLDT</Button>
					{/snippet}
				</EarningOpportunityCard>
			</div>
		{/snippet}
	</StakeContentSection>
</div>
