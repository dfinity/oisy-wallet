<script lang="ts">
	export let spacing: 'none' | 'lg' = 'none';
</script>

<hr
	class="bg-dark-blue opacity-10"
	class:my-6={spacing === 'lg'}
	style="width: 100%; border: 0.05rem solid"
/>
