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

<p class="text-center mt-4 font-bold pb-12">{$i18n.signer.idle.text.waiting}</p>
