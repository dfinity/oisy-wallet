<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import DappCard from '$lib/components/dapps/DappCard.svelte';
	import DappModal from '$lib/components/dapps/DappModal.svelte';
	import DappPromoBanner from '$lib/components/dapps/DappPromoBanner.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { modalDAppDetails } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		type DappDescription,
		dAppDescriptions,
		type FeaturedDappDescription
	} from '$lib/types/dappDescription';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	// For the moment only the first featured dapp is highlighted
	const selectFirstFeaturedDapp = (): FeaturedDappDescription | undefined =>
		dAppDescriptions.find(
			({ featured, screenshots }) => featured && nonNullish(screenshots) && screenshots.length
		) as FeaturedDappDescription | undefined;

	const featuredDapp = selectFirstFeaturedDapp();

	let selectedTag: string | undefined = undefined;
	const uniqueTags = new Set(
		dAppDescriptions.flatMap((dapp) => dapp.tags).sort((tagA, tagB) => tagA.localeCompare(tagB))
	);

	$: filteredDapps = dAppDescriptions.filter(
		({ tags }) => isNullish(selectedTag) || tags.includes(selectedTag)
	);

	let selectedDapp: DappDescription | undefined = undefined;
	$: selectedDapp = $modalDAppDetails
		? ($modalStore?.data as DappDescription | undefined)
		: undefined;
</script>

<h1 class="mb-5 mt-6">{$i18n.dapps.text.title}</h1>

{#if nonNullish(featuredDapp) && nonNullish(featuredDapp.screenshots)}
	<div class="mb-10">
		<DappPromoBanner
			on:click={() => modalStore.openDappDetails(featuredDapp)}
			dAppDescription={featuredDapp}
		/>
	</div>
{/if}

<div class="flex flex-wrap gap-4">
	<Button
		paddingSmall
		ariaLabel={$i18n.dapps.alt.show_all}
		on:click={() => (selectedTag = undefined)}
		styleClass="text-nowrap max-w-fit text-sm"
		colorStyle={selectedTag === undefined ? 'primary' : 'tertiary'}
		>{$i18n.dapps.text.all_dapps}</Button
	>
	{#each uniqueTags as tag}
		<Button
			paddingSmall
			ariaLabel={replacePlaceholders($i18n.dapps.alt.show_tag, { $tag: tag })}
			on:click={() => (selectedTag = tag)}
			styleClass="text-nowrap max-w-fit text-sm"
			colorStyle={selectedTag === tag ? 'primary' : 'tertiary'}>{tag}</Button
		>
	{/each}
</div>

<ul class="mt-8 grid list-none grid-cols-1 gap-x-4 gap-y-7 md:grid-cols-3">
	{#each filteredDapps as dApp}
		<li class="flex" in:fade>
			<DappCard
				on:click={() => {
					modalStore.openDappDetails(dApp);
				}}
				dAppDescription={dApp}
			/>
		</li>
	{/each}
</ul>

<a
	class="as-button tertiary padding-sm mx-auto my-10 w-fit text-sm no-underline"
	href="https://github.com/dfinity/oisy-wallet/issues/new?assignees=&labels=&projects=&template=dapp_submission_request.md&title=Request+a+Dapp+to+be+listed+on+the+OISY+Wallet+Dapp+Explorer"
	rel="external noopener noreferrer"
	target="_blank"
	aria-label={$i18n.dapps.alt.submit_your_dapp}
>
	<IconPlus />
	<span>
		{$i18n.dapps.text.submit_your_dapp}
	</span>
</a>

{#if $modalDAppDetails && nonNullish(selectedDapp)}
	<DappModal dAppDescription={selectedDapp} />
{/if}
