<script lang="ts">
	import connected from '$lib/assets/connected.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<h2 class="text-center mb-10 pt-12">{$i18n.signer.idle.text.title}</h2>

<div class="flex justify-center min-h-[120px]">
	<Img src={connected} role="presentation" alt={$i18n.signer.idle.alt.img_placeholder} />
</div>

<p class="text-center mt-10 font-bold pb-12">{$i18n.signer.idle.text.info}</p>
