<script>
  import { createEventDispatcher } from "svelte";

  export let fileInput = null;
  export let accept = ".fit";

  const dispatch = createEventDispatcher();

  function handleFiles() {
    const fileList = fileInput.files;
    if (fileList.length == 1) dispatch("file", fileList[0]);

    // Reset the file input
    fileInput.value = null;
  }
</script>

<style lang="scss">
  input {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    pointer-events: none;
  }
</style>

<input type="file" bind:this={fileInput} {accept} on:change={handleFiles} />
