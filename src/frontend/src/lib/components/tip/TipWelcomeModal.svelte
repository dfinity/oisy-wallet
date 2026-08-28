<script lang="ts">
	import welcomeImg from '$lib/assets/welcome-from-tips.webp';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { TIP_WELCOME_CTA_BUTTON, TIP_WELCOME_MODAL } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	/**
	 * Three points, in the order the questions actually arrive.
	 *
	 * Somebody who has just been handed money by a stranger's QR code wants to
	 * know whose it is before they want to know what it can do, and the breadth of
	 * the wallet matters least of the three — it is the reason to come back, not
	 * the reason to trust the screen in front of them.
	 */
	const points = $derived([
		{ title: $i18n.tip.welcome.point_yours_title, text: $i18n.tip.welcome.point_yours_text },
		{ title: $i18n.tip.welcome.point_use_title, text: $i18n.tip.welcome.point_use_text },
		{ title: $i18n.tip.welcome.point_chains_title, text: $i18n.tip.welcome.point_chains_text }
	]);
</script>

<Modal onClose={modalStore.close} testId={TIP_WELCOME_MODAL}>
	{#snippet title()}{$i18n.tip.welcome.title}{/snippet}

	<ContentWithToolbar>
		<!--
			The artwork carries the one thing words are worst at here: that this is a
			browser tab at oisy.com and not an app they now have to find again. Its own
			ratio, no crop — it is a drawn panel, not a photo.
		-->
		<Img
			alt={$i18n.tip.alt.welcome_illustration}
			role="img"
			src={welcomeImg}
			styleClass="mb-6 h-auto w-full rounded-xl"
		/>

		<h3 class="mb-2">{$i18n.tip.welcome.heading}</h3>

		<p class="m-0 mb-5 text-tertiary">{$i18n.tip.welcome.body}</p>

		<div class="mb-2 flex flex-col gap-4">
			{#each points as { title, text } (title)}
				<div>
					<span class="block font-bold">{title}</span>
					<span class="block text-sm text-tertiary">{text}</span>
				</div>
			{/each}
		</div>

		{#snippet toolbar()}
			<!--
				The wallet is already behind this modal with the tip in it, so closing is
				the whole action — no navigation, and nothing to confirm.
			-->
			<Button fullWidth onclick={modalStore.close} testId={TIP_WELCOME_CTA_BUTTON}>
				{$i18n.tip.welcome.cta}
			</Button>
		{/snippet}
	</ContentWithToolbar>
</Modal>
