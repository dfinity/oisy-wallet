<script lang="ts">
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="flex flex-col items-center text-center">
	<div class="mt-5 mb-7 pt-2">
		<h1 class="text-4xl md:leading-tight lg:text-5xl">
			{replaceOisyPlaceholders($i18n.auth.text.title_part_1)}<br />{$i18n.auth.text.title_part_2}
		</h1>

		<p class="text-primary mx-auto mt-5 mb-0 max-w-md text-base font-normal md:text-lg">
			{$i18n.auth.text.description}
		</p>
	</div>

	<ButtonAuthenticateWithHelp helpAlignment="center" needHelpLink={false} />
</div>
