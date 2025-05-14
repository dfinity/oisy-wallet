<script lang="ts">
  import { Input } from '@dfinity/gix-components';
  import IconSearch from '$lib/components/icons/IconSearch.svelte';
  import { ADDRESS_BOOK_SEARCH_CONTACT_INPUT } from '$lib/constants/test-ids.constants';

  export let onSearchChange: (value: string) => void;
  let search = '';

  $: onSearchChange(search);
</script>

<div class="relative w-full my-4">
  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
    <IconSearch class="text-gray-500" />
  </div>

  <Input
    name="search"
    inputType="text"
    placeholder="Search contact"
    bind:value={search}
    testId={ADDRESS_BOOK_SEARCH_CONTACT_INPUT}
    spellcheck={false}
    autocomplete="off"
    class="pl-10 w-full"
  />
</div>
