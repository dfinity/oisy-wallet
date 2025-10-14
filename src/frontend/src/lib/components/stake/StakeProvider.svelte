<script lang="ts">
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { stakeProvidersConfig } from '$lib/config/stake.config';
	import {
		STAKE_PROVIDER_EXTERNAL_URL,
		STAKE_PROVIDER_LOGO
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { StakeProvider } from '$lib/types/stake';

	interface Props {
		provider: StakeProvider;
	}

	let { provider }: Props = $props();
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.stake.text.provider}
	{/snippet}

	{#snippet mainValue()}
		<div class="flex items-center gap-1">
			<Logo
				alt={stakeProvidersConfig[provider].name}
				src={stakeProvidersConfig[provider].logo}
				testId={STAKE_PROVIDER_LOGO}
			/>

			<span>{stakeProvidersConfig[provider].name}</span>

			<ExternalLink
				ariaLabel={stakeProvidersConfig[provider].name}
				href={stakeProvidersConfig[provider].url}
				iconSize="15"
				testId={STAKE_PROVIDER_EXTERNAL_URL}
			/>
		</div>
	{/snippet}
</ModalValue>
