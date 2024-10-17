<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import DappTags from '$lib/components/dapps/DappTags.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconTwitter from '$lib/components/icons/IconTwitter.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import ExternalLinkIcon from '$lib/components/ui/ExternalLinkIcon.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { DappDescription } from '$lib/types/dappDescription';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dAppDescription: DappDescription;
	const formattedUrl = new URL(dAppDescription.website).hostname.replace('www.', '');
</script>

<Modal on:nnsClose={modalStore.close}>
	<div slot="title">
		<span class="text-center text-xl">{dAppDescription.name}</span>
	</div>

	<div class="stretch flex flex-col gap-4 pt-4">
		{#if nonNullish(dAppDescription.screenshots) && dAppDescription.screenshots.length > 0}
			<div class="overflow-hidden rounded-3xl">
				<ImgBanner
					src={dAppDescription.screenshots[0]}
					alt={replacePlaceholders($i18n.dapps.alt.website, { $dAppname: dAppDescription.name })}
				/>
			</div>
		{/if}

		<div class="rounded-3xl p-5 shadow">
			<div class="flex items-center gap-4 border-b border-light-grey pb-5">
				<div class="h-10 w-10">
					<Img
						src={dAppDescription.logo}
						alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppname: dAppDescription.name })}
					/>
				</div>
				<div>
					<div class="text-lg font-bold">{dAppDescription.name}</div>
					<div class="text-sm text-misty-rose">{formattedUrl}</div>
				</div>
				<div class="ml-auto flex space-x-4">
					{#if dAppDescription.twitter}
						<ExternalLinkIcon
							href={dAppDescription.twitter}
							ariaLabel={$i18n.dapps.alt.open_twitter}
						>
							<IconTwitter />
						</ExternalLinkIcon>
					{/if}
					{#if dAppDescription.github}
						<ExternalLinkIcon
							href={dAppDescription.github}
							ariaLabel={$i18n.dapps.alt.source_code_on_github}
						>
							<IconGitHub />
						</ExternalLinkIcon>
					{/if}
				</div>
			</div>

			<p class="m-0 my-5 text-sm">
				<Html text={dAppDescription.description} />
			</p>
			<DappTags dAppName={dAppDescription.name} tags={dAppDescription.tags} />
		</div>

		<ExternalLink
			ariaLabel={replacePlaceholders($i18n.dapps.alt.open, { $dAppname: dAppDescription.name })}
			class="as-button primary padding-sm flex flex-row-reverse mt-auto"
			href={dAppDescription.website}
			>{replacePlaceholders($i18n.dapps.text.open, {
				$dAppname: dAppDescription.name
			})}</ExternalLink
		>
	</div>
</Modal>
