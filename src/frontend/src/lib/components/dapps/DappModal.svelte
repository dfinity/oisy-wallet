<script lang="ts">
	import { Html, IconGitHub, Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import DappTags from '$lib/components/dapps/DappTags.svelte';
	import IconOpenChat from '$lib/components/icons/IconOpenChat.svelte';
	import IconTelegram from '$lib/components/icons/IconTelegram.svelte';
	import IconTwitter from '$lib/components/icons/IconTwitter.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import ExternalLinkIcon from '$lib/components/ui/ExternalLinkIcon.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OisyDappDescription } from '$lib/types/oisyDappDescription';
	import type { Option } from '$lib/types/utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let dAppDescription: OisyDappDescription;
	$: ({
		website,
		screenshots,
		twitter,
		github,
		tags,
		name,
		description,
		logo,
		callToAction,
		telegram,
		openChat
	} = dAppDescription);

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

	<div class="stretch flex flex-col gap-4">
		{#if nonNullish(screenshots) && screenshots.length > 0}
			<div class="overflow-hidden rounded-3xl">
				<ImgBanner
					fitHeight={true}
					height="100%"
					width="100%"
					src={screenshots[0]}
					alt={replacePlaceholders($i18n.dapps.alt.website, { $dAppname: name })}
				/>
			</div>
		{/if}

		<article class="rounded-3xl p-5 shadow">
			<div class="flex flex-wrap items-center justify-start gap-4 border-b border-light-grey pb-5">
				<Logo
					size="md"
					src={logo}
					alt={replacePlaceholders($i18n.dapps.alt.logo, { $dAppname: name })}
				/>
				<div class="mr-auto">
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
				<div class="flex space-x-3">
					{#if nonNullish(telegram)}
						<ExternalLinkIcon
							href={telegram}
							ariaLabel={replacePlaceholders($i18n.dapps.alt.open_telegram, {
								$dAppname: name
							})}
						>
							<IconTelegram size="22" />
						</ExternalLinkIcon>
					{/if}
					{#if nonNullish(openChat)}
						<ExternalLinkIcon
							href={openChat}
							ariaLabel={replacePlaceholders($i18n.dapps.alt.open_open_chat, {
								$dAppname: name
							})}
						>
							<IconOpenChat size="22" />
						</ExternalLinkIcon>
					{/if}
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
							<IconGitHub size="22" />
						</ExternalLinkIcon>
					{/if}
				</div>
			</div>

			<p class="m-0 my-5 text-sm [&_ul]:list-disc [&_ul]:pl-6">
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
				>{callToAction ??
					replacePlaceholders($i18n.dapps.text.open_dapp, {
						$dAppname: name
					})}</ExternalLink
			>
		{/if}
	</div>
</Modal>
