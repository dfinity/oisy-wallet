<script lang="ts">
	import SignerIdleAnimatedAstronaut from '$lib/components/signer/SignerIdleAnimatedAstronaut.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div
	class="pt-12 flex justify-center"
	role="presentation"
	aria-label={$i18n.signer.idle.alt.img_placeholder}
>
	<SignerIdleAnimatedAstronaut />
</div>

<p class="mt-4 pb-12 font-bold text-center">{$i18n.signer.idle.text.waiting}</p>
