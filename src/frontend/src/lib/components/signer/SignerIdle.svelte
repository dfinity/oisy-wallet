<script lang="ts">
	import SignerIdleAnimatedAstronaut from '$lib/components/signer/SignerIdleAnimatedAstronaut.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div
	class="flex justify-center pt-12"
	role="presentation"
	aria-label={$i18n.signer.idle.alt.img_placeholder}
>
	<SignerIdleAnimatedAstronaut />
</div>

<p class="mt-4 pb-12 text-center font-bold">{$i18n.signer.idle.text.waiting}</p>
