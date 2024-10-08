<script lang="ts">
	import { IconGitHub } from '@dfinity/gix-components';
	import IconDfinity from '$lib/components/icons/IconDfinity.svelte';
	import IconTwitter from '$lib/components/icons/IconTwitter.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	// TODO: set up a correct twitter account for Oisy and move this value to the oisy.contants module.
	const OISY_TWITTER_URL = 'https://x.com/dfinity';
</script>

<footer
	class="z-1 mx-auto flex w-full max-w-screen-2.5xl flex-1 flex-col items-center justify-end px-4 pb-5 pt-6 md:flex-1 md:flex-grow md:flex-row md:items-end md:justify-between md:px-8"
	class:md:sticky={$authNotSignedIn}
	class:md:h-md:grid={$authNotSignedIn}
	class:md:h-md:grid-cols-4={$authNotSignedIn}
	class:md:h-md:pr-0={$authNotSignedIn}
>
	<div class="flex flex-row items-center gap-4">
		<a
			href={OISY_REPO_URL}
			rel="external noopener noreferrer"
			target="_blank"
			class="rounded-full bg-white p-2"
			aria-label={$i18n.navigation.text.source_code_on_github}
		>
			<IconGitHub />
		</a>

		<a
			href={OISY_TWITTER_URL}
			rel="external noopener noreferrer"
			target="_blank"
			class="rounded-full bg-white p-2"
			aria-label={$i18n.navigation.text.source_code_on_github}
		>
			<IconTwitter />
		</a>
	</div>

	<div class="item flex flex-row items-center justify-end gap-2 text-sm">
		<IconDfinity />
		{$i18n.footer.text.copyright}
		<span>
			{replaceOisyPlaceholders($i18n.footer.text.developed_with)}
			<ExternalLink
				href="https://dfinity.org"
				ariaLabel={replaceOisyPlaceholders($i18n.footer.alt.dfinity)}
				color="blue"
				iconVisible={false}
			>
				{replaceOisyPlaceholders($i18n.footer.text.dfinity)}
			</ExternalLink>
		</span>
	</div>
</footer>
