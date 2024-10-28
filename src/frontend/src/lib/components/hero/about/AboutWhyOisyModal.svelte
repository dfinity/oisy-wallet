<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import CoverWhyOisy from '$lib/assets/cover-why-oisy.png';
	import IconCrypto from '$lib/components/icons/IconCrypto.svelte';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import IconIcLogoPlain from '$lib/components/icons/IconIcLogoPlain.svelte';
	import IconIdCard from '$lib/components/icons/IconIdCard.svelte';
	import IconKey from '$lib/components/icons/IconKey.svelte';
	import IconWorld from '$lib/components/icons/IconWorld.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { ABOUT_WHY_OISY_MODAL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<Modal on:nnsClose={modalStore.close} testId={ABOUT_WHY_OISY_MODAL}>
	<svelte:fragment slot="title"
		><span class="text-xl">{replaceOisyPlaceholders($i18n.about.why_oisy.text.title)}</span>
	</svelte:fragment>

	<div class="stretch pt-4">
		<ImgBanner size="small" src={CoverWhyOisy} alt={$i18n.about.why_oisy.text.title} />

		<p class="mt-12">
			<IconCrypto />
			<Html text={replaceOisyPlaceholders($i18n.about.why_oisy.text.hold_crypto)} />
		</p>

		<p class="mt-6">
			<IconKey />
			<Html text={replaceOisyPlaceholders($i18n.about.why_oisy.text.network_custody)} />
		</p>

		<p class="mt-6">
			<IconIcLogoPlain />
			<Html text={replaceOisyPlaceholders($i18n.about.why_oisy.text.fully_on_chain)} />
		</p>

		<p class="mt-6">
			<IconWorld />
			<Html text={replaceOisyPlaceholders($i18n.about.why_oisy.text.cross_device)} />
		</p>

		<p class="mt-6">
			<IconIdCard />
			<Html text={replaceOisyPlaceholders($i18n.about.why_oisy.text.verifiable_credentials)} />
		</p>

		<p class="my-6">
			<IconGitHub />
			<Html text={replaceOisyPlaceholders($i18n.about.why_oisy.text.open_source)} />
		</p>
	</div>

	<ButtonCloseModal colorStyle="primary" />
</Modal>
