<script>
  import logoSvg from "@/assets/logo.svg";
</script>

<style lang="scss">
  header {
    padding-bottom: 16px;
    border-bottom: 5px solid $primary;
    margin-bottom: 60px;
    user-select: none;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }

    h1 {
      color: $primary;
      display: inline-block;
      padding-left: 15px;
    }

    .logo,
    h1 {
      vertical-align: middle;
    }
  }
</style>

<header on:click>
  <span class="logo">
    {@html logoSvg}
  </span>
  <h1>TrackGoat</h1>
</header>
