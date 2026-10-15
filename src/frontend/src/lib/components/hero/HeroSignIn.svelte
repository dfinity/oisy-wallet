<script lang="ts">
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="flex flex-col items-center text-center">
	<div class="mt-5 mb-7 pt-2">
		<h1 class="text-3xl leading-[1.4] sm:text-4xl sm:leading-[1.2] lg:text-5xl">
			<span class="block text-balance">{replaceOisyPlaceholders($i18n.auth.text.title_part_1)}</span
			>
			<span class="block text-balance">{$i18n.auth.text.title_part_2}</span>
		</h1>

		<p
			class="mx-auto mt-5 mb-0 max-w-[38ch] text-base leading-[1.5] font-normal text-pretty text-primary md:text-lg"
		>
			{$i18n.auth.text.description}
		</p>
	</div>

	<ButtonAuthenticateWithHelp helpAlignment="center" needHelpLink={false} />
</div>
