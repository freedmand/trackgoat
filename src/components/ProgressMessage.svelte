<script>
  import Spinner from "@/components/Spinner";

  export let text;
</script>

<style lang="scss">
  .message {
    display: inline-block;

    .spinner,
    .text {
      display: inline-block;
      vertical-align: middle;
    }

    .spinner {
      padding-right: 3px;
    }
  }
</style>

<span class="message">
  <span class="spinner"><Spinner /></span>
  <span class="text">{text}</span>
</span>
