<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import CoverWhyOisy from '$lib/assets/cover-why-oisy.png';
	import AboutFeatureItem from '$lib/components/about/AboutFeatureItem.svelte';
	import IconCrypto from '$lib/components/icons/IconCrypto.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconIcLogoPlain from '$lib/components/icons/IconIcLogoPlain.svelte';
	import IconIdCard from '$lib/components/icons/IconIdCard.svelte';
	import IconKey from '$lib/components/icons/IconKey.svelte';
	import IconWorld from '$lib/components/icons/IconWorld.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { ABOUT_WHY_OISY_MODAL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const features = [
		{
			title: $i18n.about.why_oisy.text.hold_crypto.title,
			description: $i18n.about.why_oisy.text.hold_crypto.description,
			icon: IconCrypto
		},
		{
			title: $i18n.about.why_oisy.text.network_custody.title,
			description: $i18n.about.why_oisy.text.network_custody.description,
			icon: IconKey
		},
		{
			title: $i18n.about.why_oisy.text.fully_on_chain.title,
			description: $i18n.about.why_oisy.text.fully_on_chain.description,
			icon: IconIcLogoPlain
		},
		{
			title: $i18n.about.why_oisy.text.cross_device.title,
			description: $i18n.about.why_oisy.text.cross_device.description,
			icon: IconWorld
		},
		{
			title: $i18n.about.why_oisy.text.verifiable_credentials.title,
			description: $i18n.about.why_oisy.text.verifiable_credentials.description,
			icon: IconIdCard
		},
		{
			title: $i18n.about.why_oisy.text.open_source.title,
			description: $i18n.about.why_oisy.text.open_source.description,
			icon: IconGitHub
		}
	];
</script>

<Modal onClose={modalStore.close} testId={ABOUT_WHY_OISY_MODAL}>
	{#snippet title()}
		<span class="text-xl">{replaceOisyPlaceholders($i18n.about.why_oisy.text.title)}</span>
	{/snippet}

	<ContentWithToolbar>
		<ImgBanner alt={$i18n.about.why_oisy.text.title} src={CoverWhyOisy} styleClass="max-h-56" />

		<div class="mt-5 flex flex-col gap-6">
			{#each features as { title, description, icon: IconCmp } (title)}
				<AboutFeatureItem {description} {title}>
					{#snippet icon()}
						<IconCmp />
					{/snippet}
				</AboutFeatureItem>
			{/each}
		</div>

		{#snippet toolbar()}
			<ButtonCloseModal />
		{/snippet}
	</ContentWithToolbar>
</Modal>
