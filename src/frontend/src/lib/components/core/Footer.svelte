<script lang="ts">
	import { IconGitHub } from '@dfinity/gix-components';
	import IconDfinity from '$lib/components/icons/IconDfinity.svelte';
	import IconTwitter from '$lib/components/icons/IconTwitter.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import ExternalLinkIcon from '$lib/components/ui/ExternalLinkIcon.svelte';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	// TODO: set up a correct twitter account for Oisy and move this value to the oisy.contants module.
	const OISY_TWITTER_URL = 'https://x.com/dfinity';
</script>

<footer
	class="z-1 mx-auto flex w-full max-w-screen-2.5xl flex-1 flex-col items-center justify-end px-4 pb-5 pt-6 sm:flex-1 sm:flex-grow sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:fixed lg:inset-x-0 lg:bottom-0"
	class:sm:sticky={$authNotSignedIn}
	class:md:h-md:grid={$authNotSignedIn}
	class:md:h-md:grid-cols-4={$authNotSignedIn}
	class:md:h-md:pr-0={$authNotSignedIn}
	class:sm:fixed={$authSignedIn}
	class:sm:inset-x-0={$authSignedIn}
	class:sm:bottom-0={$authSignedIn}
>
	<div class="col-span-2 flex w-full flex-col items-center justify-between sm:flex-row sm:gap-4">
		<div class="flex flex-row items-center gap-4">
			<ExternalLinkIcon
				href={OISY_REPO_URL}
				ariaLabel={$i18n.navigation.text.source_code_on_github}
			>
				<IconGitHub />
			</ExternalLinkIcon>

			<ExternalLinkIcon
				href={OISY_TWITTER_URL}
				ariaLabel={replaceOisyPlaceholders($i18n.navigation.alt.open_twitter)}
			>
				<IconTwitter />
			</ExternalLinkIcon>
		</div>

		<div
			class="item flex flex-row items-center justify-end gap-2 text-sm transition-all duration-200 ease-in-out lg:max-w-48 xl:max-w-none"
			class:sm:max-w-none={$authNotSignedIn}
			class:lg:max-w-none={$authNotSignedIn}
			class:md:h-md:pr-4={$authNotSignedIn}
			class:sm:invisible={$authSignedIn}
			class:1.5md:visible={$authSignedIn}
			class:sm:translate-x-full={$authSignedIn}
			class:1.5md:translate-x-0={$authSignedIn}
		>
			<ExternalLink
				href="https://dfinity.org"
				ariaLabel={replaceOisyPlaceholders($i18n.footer.alt.dfinity)}
				iconVisible={false}
			>
				<div class="flex flex-row items-center gap-2">
					<IconDfinity />
					<span
						class:sm:hidden={$authSignedIn}
						class:xl:flex={$authSignedIn}
						class:md:h-md:hidden={$authNotSignedIn}
						class:1.5md:h-md:flex={$authNotSignedIn}
					>
						{replaceOisyPlaceholders($i18n.footer.text.developed_with)}
					</span>
				</div>
			</ExternalLink>
		</div>
	</div>
</footer>
