<script lang="ts">
	import { page } from '$app/state';
	import ExtensionPanelSnapshotSetter from '$lib/components/extension/ExtensionPanelSnapshotSetter.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import TokenGroupCard from '$lib/components/tokens/TokenGroupCard.svelte';
	import TokensDisplayHandler from '$lib/components/tokens/TokensDisplayHandler.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_EXTENSION_PANEL_ASSETS_LIMIT } from '$lib/constants/extension.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token-ui';
	import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { isTokenUiGroup } from '$lib/utils/token-group.utils';

	let tokens = $state<TokenUiOrGroupUi[] | undefined>();

	// The first rows of OISY's home list: same grouping, order and zero-balance setting.
	let rows = $derived(tokens?.slice(0, OISY_EXTENSION_PANEL_ASSETS_LIMIT));

	const rowKey = (tokenOrGroup: TokenUiOrGroupUi): string =>
		isTokenUiGroup(tokenOrGroup)
			? `group:${tokenOrGroup.group.id.description}`
			: `token:${tokenOrGroup.token.id.description}:${tokenOrGroup.token.network.id.description}`;

	// The panel only shows; the token's page opens in OISY.
	const openInOisy = (token: TokenUi) =>
		window.open(`${page.url.origin}${transactionsUrl({ token })}`, '_blank', 'noopener,noreferrer');
</script>

<section class="flex flex-col gap-2">
	<div class="flex items-center justify-between gap-2">
		<h2 class="text-base font-bold">{$i18n.navigation.text.tokens}</h2>

		<ExternalLink
			ariaLabel={$i18n.extension.panel.all_tokens}
			href={`${page.url.origin}${AppPath.Tokens}`}
			iconAsLast
			iconSize="16"
			styleClass="text-sm"
		>
			{$i18n.extension.panel.view_all}
		</ExternalLink>
	</div>

	<TokensDisplayHandler bind:tokens>
		<TokensSkeletons loading={rows === undefined}>
			<div class="flex flex-col gap-3">
				{#each rows ?? [] as tokenOrGroup (rowKey(tokenOrGroup))}
					<div class="overflow-hidden rounded-xl">
						{#if isTokenUiGroup(tokenOrGroup)}
							<TokenGroupCard onTokenClick={openInOisy} tokenGroup={tokenOrGroup.group} />
						{:else}
							{@const { token } = tokenOrGroup}

							<div class="transition-colors duration-300 hover:bg-primary">
								<TokenCard data={token} onClick={() => openInOisy(token)} showNetwork={false} />
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</TokensSkeletons>
	</TokensDisplayHandler>
</section>

<ExtensionPanelSnapshotSetter {rows} />
