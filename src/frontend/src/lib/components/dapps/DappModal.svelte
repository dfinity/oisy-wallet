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
	import type { Option } from '$lib/types/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dAppDescription: DappDescription;
	$: ({ website, screenshots, twitter, github, tags, name, description, logo } = dAppDescription);

	let websiteURL: Option<URL>;
	$: {
		try {
			websiteURL = new URL(website);
		} catch (e) {
			websiteURL = null;
		}
	}
</script>

<Modal on:nnsClose={modalStore.close}>
	<svelte:fragment slot="title">
		<span class="text-center text-xl">{name}</span>
	</svelte:fragment>

	<div class="stretch flex flex-col gap-4 pt-4">
		{#if nonNullish(screenshots) && screenshots.length > 0}
			<div class="overflow-hidden rounded-3xl">
				<ImgBanner
					src={screenshots[0]}
					alt={replacePlaceholders($i18n.dapps.alt.website, { $dAppname: name })}
				/>
			</div>
		{/if}

		<article class="rounded-3xl p-5 shadow">
			<div class="flex items-center gap-4 border-b border-light-grey pb-5">
				<Img
					width="40"
					height="40"
					src={logo}
					alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppname: name })}
				/>
				<div>
					<div class="text-lg font-bold">{name}</div>
					{#if nonNullish(websiteURL)}
						<ExternalLink
							iconVisible={false}
							ariaLabel={replacePlaceholders($i18n.dapps.text.open_dapp, {
								$dAppname: name
							})}
							href={websiteURL.toString()}
							styleClass="text-sm text-misty-rose">{websiteURL.hostname}</ExternalLink
						>
					{/if}
				</div>
				<div class="ml-auto flex space-x-4">
					{#if nonNullish(twitter)}
						<ExternalLinkIcon
							href={twitter}
							ariaLabel={replacePlaceholders($i18n.dapps.alt.open_twitter, {
								$dAppname: name
							})}
						>
							<IconTwitter />
						</ExternalLinkIcon>
					{/if}
					{#if nonNullish(github)}
						<ExternalLinkIcon
							href={github}
							ariaLabel={replacePlaceholders($i18n.dapps.alt.source_code_on_github, {
								$dAppname: name
							})}
						>
							<IconGitHub />
						</ExternalLinkIcon>
					{/if}
				</div>
			</div>

			<p class="m-0 my-5 text-sm">
				<Html text={description} />
			</p>
			<DappTags dAppName={name} {tags} />
		</article>

		{#if nonNullish(websiteURL)}
			<ExternalLink
				ariaLabel={replacePlaceholders($i18n.dapps.alt.open_dapp, {
					$dAppname: name
				})}
				styleClass="as-button primary padding-sm mt-auto flex flex-row-reverse"
				href={websiteURL.toString()}
				>{replacePlaceholders($i18n.dapps.text.open_dapp, {
					$dAppname: name
				})}</ExternalLink
			>
		{/if}
	</div>
</Modal>
