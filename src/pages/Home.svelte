<script>
  import Header from "@/components/Header";
  import LogoButton from "@/components/LogoButton";
  import Analyzer from "@/pages/Analyzer";

  import downloadSvg from "@/assets/download.svg";

  let fitFile = null;

  function reset() {
    fitFile = null;
  }
</script>

<style lang="scss">
  p {
    font-size: 19px;
    max-width: 660px;
  }

  .spacer {
    height: 30px;
  }
</style>

<Header on:click={reset} />

{#if fitFile == null}
  <p>
    Welcome to TrackGoat, a platform for analyzing and suggesting track workouts
    to monitor and improve your running fitness.
  </p>
  <p>
    To get started, import workout data from .FIT files. TrackGoat will analyze
    the workout data, find track ovals in the GPS data, and build a
    comprehensive table of your workout history.
  </p>

  <div class="spacer" />

  <LogoButton
    icon={downloadSvg}
    text="Import Workout Data"
    fileUpload={true}
    on:file={(f) => (fitFile = f.detail)}
  />
{:else}
  <Analyzer {fitFile} />
{/if}
