<script lang="ts">
	import { IconGitHub } from '@dfinity/gix-components';
	import IconDfinity from '$lib/components/icons/IconDfinity.svelte';
	import IconTwitter from '$lib/components/icons/IconTwitter.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import ExternalLinkIcon from '$lib/components/ui/ExternalLinkIcon.svelte';
	import { OISY_REPO_URL, OISY_STATUS_URL } from '$lib/constants/oisy.constants';
	import { authNotSignedIn, authSignedIn } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	// TODO: set up a correct twitter account for Oisy and move this value to the oisy.contants module.
	const OISY_TWITTER_URL = 'https://x.com/dfinity';
</script>

<footer
	class="z-1 pointer-events-none mx-auto flex w-full max-w-screen-2.5xl flex-1 flex-col items-center justify-end px-4 pb-5 pt-12 sm:flex-1 sm:flex-grow sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:fixed lg:inset-x-0 lg:bottom-0"
	class:sm:sticky={$authNotSignedIn}
	class:md:h-md:grid={$authNotSignedIn}
	class:md:h-md:grid-cols-2={$authNotSignedIn}
	class:md:h-md:pr-0={$authNotSignedIn}
	class:md:fixed={$authSignedIn}
	class:md:inset-x-0={$authSignedIn}
	class:md:bottom-0={$authSignedIn}
>
	<div
		class="pointer-events-none flex w-full flex-col items-center justify-between md:flex-row md:gap-4"
		class:sm:flex-row={$authNotSignedIn}
		class:sm:gap-4={$authNotSignedIn}
	>
		<div class="pointer-events-auto flex flex-row items-center gap-4">
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

			<a
				href={OISY_STATUS_URL}
				rel="external noopener noreferrer"
				target="_blank"
				class="mx-auto no-underline"
				aria-label={replaceOisyPlaceholders($i18n.footer.alt.status)}
			>
				<Badge variant="warning">beta</Badge>
			</a>
		</div>

		<div
			class="item pointer-events-auto flex flex-row items-center justify-end gap-2 text-sm lg:max-w-48 xl:max-w-none"
			class:sm:max-w-none={$authNotSignedIn}
			class:lg:max-w-none={$authNotSignedIn}
			class:md:h-md:pr-4={$authNotSignedIn}
			class:md:transition-all={$authSignedIn}
			class:md:duration-200={$authSignedIn}
			class:md:ease-in-out={$authSignedIn}
			class:md:invisible={$authSignedIn}
			class:1.5md:visible={$authSignedIn}
			class:md:translate-x-full={$authSignedIn}
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
						class:md:hidden={$authSignedIn}
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
