<script lang="ts">
    let { onSearchChange }: { onSearchChange: (value: string) => void } = $props();
    let search = '';
  
    const onInput = (e: Event) => {
      search = (e.target as HTMLInputElement).value;
      onSearchChange(search);
    };
  </script>
  
  <div class="w-full my-4">
    <input
      type="text"
      placeholder="Search contact"
      class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      oninput={onInput}
      bind:value={search}
    />
  </div>
  