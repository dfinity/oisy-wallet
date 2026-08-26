<script lang="ts">
	import tipIntroImg from '$lib/assets/tip-intro-img.webp';
	import IconArrowRight from '$lib/components/icons/IconArrowRight.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import {
		TIP_INTRO_GET_STARTED_BUTTON,
		TIP_INTRO_HISTORY_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onGetStarted: () => void;
		onViewHistory: () => void;
	}

	let { onGetStarted, onViewHistory }: Props = $props();
</script>

<ContentWithToolbar>
	<!--
		No aspect box and no tinted ground: the artwork is the drawn panel, at its
		own 1024x480, and letting it size itself keeps that ratio exactly rather
		than cropping it to whichever one we would have hard-coded here.
	-->
	<Img
		alt={$i18n.tip.alt.intro_illustration}
		role="img"
		src={tipIntroImg}
		styleClass="mb-6 h-auto w-full rounded-xl"
	/>

	<h3 class="mb-3">{$i18n.tip.text.intro_heading}</h3>

	<p class="mb-4 text-tertiary">{$i18n.tip.text.intro_body}</p>

	<div class="mb-4">
		<ExternalLink
			ariaLabel={$i18n.tip.text.learn_how_it_works}
			href={OISY_DOCS_URL}
			iconVisible={true}
		>
			{$i18n.tip.text.learn_how_it_works}
		</ExternalLink>
	</div>

	{#snippet toolbar()}
		<div class="flex gap-3">
			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={onViewHistory}
				testId={TIP_INTRO_HISTORY_BUTTON}
			>
				{$i18n.tip.text.view_history}
			</Button>

			<Button fullWidth onclick={onGetStarted} testId={TIP_INTRO_GET_STARTED_BUTTON}>
				{$i18n.tip.text.get_started}

				<IconArrowRight />
			</Button>
		</div>
	{/snippet}
</ContentWithToolbar>
