<script>
  import FileSelect from "@/components/FileSelect";
  import { createEventDispatcher } from "svelte";

  export let icon;
  export let text;

  export let fileUpload = false;

  const dispatch = createEventDispatcher();
  let fileUploadElem = null;

  function handleClick() {
    if (fileUploadElem != null) fileUploadElem.click();
    dispatch("click");
  }
</script>

<style lang="scss">
  button {
    background: white;
    border: solid 4px $black;
    padding: 6px 10px;
    color: inherit;
    cursor: pointer;
    position: relative;

    &:hover {
      filter: brightness(120%);
    }

    .text {
      font-weight: bold;
      font-size: 18px;
    }

    .icon {
      :global(svg) {
        height: 20px;
      }

      padding: 0 3px;
    }

    .icon,
    .text {
      display: inline-block;
      vertical-align: middle;
    }
  }
</style>

<button on:click={handleClick}>
  <span class="icon">{@html icon}</span>
  <span class="text">{text}</span>
  {#if fileUpload}
    <FileSelect bind:fileInput={fileUploadElem} on:file />
  {/if}
</button>
