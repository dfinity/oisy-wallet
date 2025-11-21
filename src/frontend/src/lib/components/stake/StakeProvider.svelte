<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import {
		STAKE_PROVIDER_EXTERNAL_URL,
		STAKE_PROVIDER_LOGO
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { StakeProvider } from '$lib/types/stake';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import StakeProviderItem from '$lib/components/stake/StakeProviderItem.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';

	interface Props {
		provider: StakeProvider;
		data: { icon: Component; title: string; description?: string }[];
	}

	let { provider, data }: Props = $props();

	let expanded = $state(false);

	let items = $derived(expanded && data.length > 0 ? data : [data[0]]);
</script>

<div class="my-4 rounded-lg border border-disabled bg-secondary px-2 py-3">
	<div class="flex justify-between">
		<div class="flex items-center gap-3">
			<Logo
				alt={stakeProvidersConfig[provider].name}
				size="xs"
				src={stakeProvidersConfig[provider].logo}
				testId={STAKE_PROVIDER_LOGO}
			/>
			<span class="font-bold">
				{replacePlaceholders($i18n.stake.text.provider, {
					$provider: stakeProvidersConfig[provider].name
				})}
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

	<div class="mt-4 flex flex-col px-4">
		{#each items as { icon: Icon, title: titleStr, description: descriptionStr }}
			<StakeProviderItem>
				{#snippet icon()}
					<Icon />
				{/snippet}
				{#snippet title()}
					{titleStr}
				{/snippet}
				{#snippet description()}
					{descriptionStr}
				{/snippet}
			</StakeProviderItem>
		{/each}
	</div>

	{#if data.length > 1}
		<Button
			fullWidth
			transparent
			colorStyle="muted"
			onclick={() => (expanded = !expanded)}
			paddingSmall
			styleClass="text-brand-primary hover:bg-transparent hover:text-brand-secondary"
			innerStyleClass="items-center"
		>
			{expanded ? $i18n.core.text.less : $i18n.core.text.more}
			<IconExpand {expanded} />
		</Button>
	{/if}
</div>
