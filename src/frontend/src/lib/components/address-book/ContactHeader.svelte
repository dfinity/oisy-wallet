<script lang="ts">
	import Avatar from '$lib/components/address-book/Avatar.svelte';
	import IconContactHeader from '$lib/components/icons/IconContactHeader.svelte';

	let { name, styleClass = '' } = $props();
</script>

<div class={`relative flex flex-col items-center pb-5 ${styleClass}`}>
	<div class="self-stretch text-[lightgray]">
		<IconContactHeader></IconContactHeader>
	</div>
	<div>
		<Avatar variant="xl" {name} styleClass="mt-[-50%] border-3 border-primary-inverted"></Avatar>
	</div>
	<div class="pt-5 text-2xl font-bold text-primary md:text-3xl">
		{name}
	</div>
</div>
