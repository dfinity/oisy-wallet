<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import DappCard from '$lib/components/dapps/DappCard.svelte';
	import DappPromoBanner from '$lib/components/dapps/DappPromoBanner.svelte';
	import SubmitDappButton from '$lib/components/dapps/SubmitDappButton.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import {
		TRACK_COUNT_DAPP_FILTER_BUTTON,
		TRACK_COUNT_DAPP_OPEN_INFO_MODAL
	} from '$lib/constants/analytics.contants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { FeaturedOisyDappDescription } from '$lib/types/dapp-description';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { resolveText } from '$lib/utils/i18n.utils.js';

	// For the moment only the first featured dapp is highlighted
	const selectFirstFeaturedDapp = (): FeaturedOisyDappDescription | undefined =>
		dAppDescriptions.find(
			({ featured, screenshots }) => featured && nonNullish(screenshots) && screenshots.length
		) as FeaturedOisyDappDescription | undefined;

	let featuredDapp = $state<FeaturedOisyDappDescription | undefined>(selectFirstFeaturedDapp());

	let selectedTag = $state<string | undefined>();

	let uniqueTags = $state(
		new Set(
			dAppDescriptions.flatMap((dapp) => dapp.tags).sort((tagA, tagB) => tagA.localeCompare(tagB))
		)
	);

	let filteredDapps = $derived(
		dAppDescriptions.filter(({ tags }) => isNullish(selectedTag) || tags.includes(selectedTag))
	);

	const modalId = Symbol();

	const onClickFilterBtn = (btnTag: string | undefined = undefined) => {
		trackEvent({
			name: TRACK_COUNT_DAPP_FILTER_BUTTON,
			metadata: {
				tag: nonNullish(btnTag)
					? resolveText({ i18n: $i18n, path: btnTag })
					: $i18n.dapps.text.all_dapps,
				id: nonNullish(btnTag) ? btnTag : 'dapps.categories.all_dapps'
			}
		});

		selectedTag = btnTag;
	};
</script>

<PageTitle>{$i18n.dapps.text.title}</PageTitle>

{#if nonNullish(featuredDapp) && nonNullish(featuredDapp.screenshots)}
	<div class="mb-6 md:mb-10">
		<DappPromoBanner
			onclick={() => modalStore.openDappDetails({ id: modalId, data: featuredDapp })}
			dAppDescription={featuredDapp}
		/>
	</div>
{/if}

<div class="no-scrollbar flex gap-4 overflow-x-auto p-1 md:flex-wrap md:p-0">
	<Button
		paddingSmall
		ariaLabel={$i18n.dapps.alt.show_all}
		onclick={() => onClickFilterBtn()}
		styleClass="text-nowrap max-w-fit text-sm"
		colorStyle={selectedTag === undefined ? 'primary' : 'tertiary'}
	>
		{$i18n.dapps.text.all_dapps}
	</Button>
	{#each uniqueTags as tag (tag)}
		<Button
			paddingSmall
			ariaLabel={replacePlaceholders($i18n.dapps.alt.show_tag, {
				$tag: resolveText({ i18n: $i18n, path: tag })
			})}
			onclick={() => onClickFilterBtn(tag)}
			styleClass="text-nowrap max-w-fit text-sm"
			colorStyle={selectedTag === tag ? 'primary' : 'tertiary'}
			>{resolveText({ i18n: $i18n, path: tag })}</Button
		>
	{/each}
</div>

<ul class="mt-10 grid list-none grid-cols-2 flex-row gap-x-4 gap-y-10 md:grid-cols-3">
	{#each filteredDapps as dApp (dApp.id)}
		<li class="flex" in:fade>
			<DappCard
				on:click={() => {
					modalStore.openDappDetails({ id: modalId, data: dApp });
					trackEvent({
						name: TRACK_COUNT_DAPP_OPEN_INFO_MODAL,
						metadata: { dappId: dApp.id }
					});
				}}
				dAppDescription={dApp}
			/>
		</li>
	{/each}
</ul>

<SubmitDappButton />

<style lang="postcss">
	@media (max-width: 360px) {
		ul {
			@apply grid-cols-1;
		}
	}
</style>
