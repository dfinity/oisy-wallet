<script lang="ts">
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils.js';
import CoverHow from '$lib/assets/cover-how-it-works.png';
import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
import IconIdCard from '$lib/components/icons/IconIdCard.svelte';
import IconKey from '$lib/components/icons/IconKey.svelte';
import { Html } from '@dfinity/gix-components';
import IconWorld from '$lib/components/icons/IconWorld.svelte';
import IconIcLogoPlain from '$lib/components/icons/IconIcLogoPlain.svelte';
import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
import { i18n } from '$lib/stores/i18n.store.js';




</script>

<h1 class="text-xl">{replaceOisyPlaceholders($i18n.about.how.text.title)}</h1>

<div class="stretch pt-4">
	<ImgBanner size="small" src={CoverHow} alt={$i18n.about.how.text.title} />

	<p class="mt-12">
		<IconKey />
		<Html text={replaceOisyPlaceholders($i18n.about.how.text.self_custody)} />
	</p>

	<p class="mt-6">
		<IconIcLogoPlain />
		<Html text={replaceOisyPlaceholders($i18n.about.how.text.fully_on_chain)} />
	</p>

	<p class="mt-6">
		<IconWorld />
		<Html text={replaceOisyPlaceholders($i18n.about.how.text.cross_device)} />
	</p>

	<p class="mt-6">
		<IconIdCard />
		<Html text={replaceOisyPlaceholders($i18n.about.how.text.verifiable_credentials)} />
	</p>

	<p class="my-6">
		<IconGitHub />
		<Html text={replaceOisyPlaceholders($i18n.about.how.text.open_source)} />
	</p>
</div>