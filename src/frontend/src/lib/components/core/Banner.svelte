<script lang="ts">
	import { Html, IconClose, IconWarning } from '@dfinity/gix-components';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { BETA, STAGING } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { isPWAStandalone } from '$lib/utils/device.utils';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';

	let envBannerVisible = $state(true);

	const closeEnvBanner = () => (envBannerVisible = false);

	let pwaBannerVisible = $state(true);

	const closePwaBanner = () => (pwaBannerVisible = false);

	let awsTemporaryBannerVisible = $state(true);

	const closeAwsTemporaryBanner = () => (awsTemporaryBannerVisible = false);

	// We are using a temporary banner as a workaround for the AWS outage.
	// No need to localise this string since we expect it to be fixed shortly.
	const temporaryBannerString =
		'Due to an ongoing AWS outage, some Ethereum RPC providers are temporarily unavailable. This may affect how your Ethereum and related tokens display in OISY.<br>' +
		'OISY itself remains fully operational as it runs on a decentralized infrastructure (Internet Computer).';
</script>

{#if STAGING && envBannerVisible}
	<div class="test-banner flex justify-between gap-4">
		<span class="flex items-center justify-center gap-4">
			<IconWarning size="48px" />
			<h3 class="clamp-4">{$i18n.core.info.test_banner}</h3>
		</span>
		<button aria-label={$i18n.core.text.close} onclick={closeEnvBanner}><IconClose /></button>
	</div>
{:else if BETA && envBannerVisible}
	<div
		class="fixed left-[50%] top-6 z-10 flex min-w-80 -translate-x-[50%] justify-between gap-4 rounded-lg bg-primary"
	>
		<WarningBanner>
			<span class="w-full px-2">{$i18n.core.info.test_banner_beta}</span>
			<button aria-label={$i18n.core.text.close} onclick={closeEnvBanner}>
				<IconClose />
			</button>
		</WarningBanner>
	</div>
{/if}

<!-- TODO remove this WarningBanner again as soon a solution is found for enabling display type standalone  -->
{#if isPWAStandalone() && pwaBannerVisible}
	<div
		class="fixed left-[50%] top-6 z-10 flex min-w-80 -translate-x-[50%] justify-between gap-4 rounded-lg bg-primary"
	>
		<WarningBanner>
			<span class="w-full px-2">
				<Html text={replaceOisyPlaceholders($i18n.core.warning.standalone_mode)} />
			</span>
			<button aria-label={$i18n.core.text.close} onclick={closePwaBanner}>
				<IconClose />
			</button>
		</WarningBanner>
	</div>
{/if}

<!-- TODO: remove this temporary WarningBanner again as soon as AWS fixes the issue -->
{#if awsTemporaryBannerVisible}
	<div
		class="fixed left-[50%] top-6 z-10 flex min-w-80 -translate-x-[50%] justify-between gap-4 rounded-lg bg-primary"
	>
		<div
			class="border-info-solid bg-info-subtle-10 text-info-primary inline-flex w-full items-center justify-center gap-2 rounded-lg border px-6 py-2 text-xs font-bold sm:w-fit md:text-base"
		>
			<IconInfo></IconInfo>

			<span class="w-full px-2"><Html text={temporaryBannerString} /></span>
			<button aria-label={$i18n.core.text.close} onclick={closeAwsTemporaryBanner}>
				<IconClose />
			</button>
		</div>
	</div>
{/if}

<style lang="scss">
	div.test-banner {
		position: fixed;
		top: 0;
		left: 50%;
		transform: translate(-50%, 0);

		z-index: calc(var(--overlay-z-index) + 10);

		background: var(--color-background-error-primary);

		padding: var(--padding-2x) var(--padding-3x);
		margin: var(--padding-3x) 0;

		border-radius: var(--border-radius);

		border: 4px solid black;

		width: calc(100% - var(--padding-4x));
		max-width: 768px;

		box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1215686275);
	}
</style>
