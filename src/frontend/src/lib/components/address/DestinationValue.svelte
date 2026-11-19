<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconAstronautHelmet from '$lib/components/icons/icon-astronaut/IconAstronautHelmet.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		token: Token;
		destination?: string;
		isDestinationCustom?: boolean;
		// The last screen before the assets leave shows the whole address: a shortened one cannot tell
		// it apart from a lookalike that shares its first and last characters.
		fullAddress?: boolean;
		children?: Snippet;
	}

	let {
		token,
		destination = '',
		isDestinationCustom = false,
		fullAddress = false,
		children
	}: Props = $props();
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.core.text.destination}
	{/snippet}

	{#snippet mainValue()}
		<div class="flex items-center gap-2">
			{#if !isDestinationCustom}
				<div
					style={`width: ${logoSizes['xxs']}; height: ${logoSizes['xxs']};`}
					class="flex items-center justify-center"
				>
					<IconAstronautHelmet />
				</div>
				<span>{$i18n.convert.text.default_destination}</span>
			{:else}
				<NetworkLogo color="off-white" network={token.network} />
				{#if fullAddress}
					<span class="break-all">{destination}</span>
				{:else}
					<span>{shortenWithMiddleEllipsis({ text: destination ?? '' })}</span>
				{/if}
			{/if}

			{@render children?.()}
		</div>
	{/snippet}
</ModalValue>
