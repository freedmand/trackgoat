<script>
  import ProgressMessage from "@/components/ProgressMessage";
  import { Workout } from "@/lib/workout";
  import { makeMap, addCoords, getCenter, addTrack } from "@/lib/map";
  import { identifyTrack } from "@/lib/track";

  export let fitFile;
  let workout = null;
  let mapContainer = null;
  let map = null;
  let trackAdded = false;

  async function updateWorkout(fitFile) {
    if (fitFile != null) {
      trackAdded = false;
      workout = await Workout.fromFile(fitFile);
      if (mapContainer != null) {
        map = await makeMap(mapContainer, getCenter(workout.coords));
        addCoords(map, workout.coords);
      }

      // Extract track workout
      const track = identifyTrack(workout.coords);
      if (track.arc != null) {
        addTrack(map, track);
        trackAdded = true;
      }
    }
  }

  $: {
    updateWorkout(fitFile);
  }

  $: MESSAGES = [
    fitFile == null ? "Loading..." : `Analyzing ${fitFile.name}`,
    "Analyzing workout data",
  ];

  $: step = map == null ? 0 : 1;
  $: message = MESSAGES[step];
</script>

{#if !trackAdded}
  <ProgressMessage text={message} />
{/if}
<div style="height: 600px;" bind:this={mapContainer} />
