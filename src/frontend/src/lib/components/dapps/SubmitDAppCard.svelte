<script>
	import { i18n } from '$lib/stores/i18n.store';

	const handleClick = () => {
		window.location.href = 'https://github.com/dfinity/oisy-wallet';
	};
</script>

<div
	class="rounded-lg shadow-md bg-blue-500 p-6 flex items-center justify-center text-white cursor-pointer hover:bg-blue-600 transition-colors"
	on:click={handleClick}
>
	<div class="text-center">
		<span class="block text-2xl font-semibold">+</span>
		<p class="mt-2">{$i18n.dapps.text.submit}</p>
	</div>
</div>
