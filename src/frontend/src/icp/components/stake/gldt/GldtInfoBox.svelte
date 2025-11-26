<script lang="ts">
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import { StakeProvider } from '$lib/types/stake';
	import { STAKE_PROVIDER_EXTERNAL_URL } from '$lib/constants/test-ids.constants';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import IconClock from '$lib/components/icons/lucide/IconClock.svelte';
	import IconGift from '$lib/components/icons/IconGift.svelte';
	import IconLineChart from '$lib/components/icons/lucide/IconLineChart.svelte';
	import IconBook from '$lib/components/icons/IconBook.svelte';
	import IconContainer from '$lib/components/icons/IconContainer.svelte';
</script>

<StakeContentSection>
	{#snippet title()}
		<div class="flex w-full items-center gap-3 border-b border-secondary pb-4">
			<Logo src={stakeProvidersConfig[StakeProvider.GLDT].logo} size="md" />
			<h3 class="flex flex-1">What is GLDT</h3>
			<ExternalLink
				ariaLabel={stakeProvidersConfig[StakeProvider.GLDT].name}
				href={stakeProvidersConfig[StakeProvider.GLDT].url}
				iconAsLast
				iconSize="15"
				styleClass="text-sm"
				testId={STAKE_PROVIDER_EXTERNAL_URL}
			>
				{$i18n.stake.text.visit_provider}
			</ExternalLink>
		</div>
	{/snippet}
	{#snippet content()}
		<p class="mt-4 text-sm text-secondary"
			>GLDT stands for “Gold Token”, being a fungible token backed by GLD NFTs. GLD NFTs are NFTs
			that represent irrefutable ownership of physical gold bars. 1 GLDT represents exactly 0.01g of
			gold, and GLD NFTs can be swapped at a ratio of 1g for 100 GLDTs.</p
		>

		<div class="mt-6 flex grid w-full grid-cols-1 gap-3 text-center text-sm md:grid-cols-3">
			<div class="flex w-full flex-col items-center">
				<span
					class="rounded-full bg-gradient-to-r from-gold-0 to-gold-100 p-4 text-primary-inverted"
				>
					<IconContainer size="24" />
				</span>
				<span class="my-3 text-lg font-bold">Backed by real gold</span>
				<p class="text-tertiary"
					>Every GLDT token is backed by actual gold stored in secure vaults</p
				>
			</div>
			<div class="flex w-full flex-col items-center">
				<span
					class="rounded-full bg-gradient-to-r from-gold-0 to-gold-100 p-4 text-primary-inverted"
				>
					<IconClock size="24" />
				</span>
				<span class="my-3 text-lg font-bold">Flexible terms</span>
				<p class="text-tertiary">No lock-up periods, stake and unstake anytime you want</p>
			</div>
			<div class="flex w-full flex-col items-center">
				<span
					class="rounded-full bg-gradient-to-r from-gold-0 to-gold-100 p-4 text-primary-inverted"
				>
					<IconLineChart size="24" />
				</span>
				<span class="my-3 text-lg font-bold">Stable returns</span>
				<p class="text-tertiary">Earn consistent 8.5% APY with minimal volatility risk</p>
			</div>
		</div>
	{/snippet}
</StakeContentSection>
