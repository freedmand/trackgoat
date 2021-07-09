<script>
  import { onDestroy, onMount } from "svelte";

  const numSpinners = 10;
  const spinnerWidth = 0.2;
  const spinnerY1 = 5;
  const spinnerY2 = 10;
  const INTERVAL = 60; // millisecond change interval

  function makeSpinner(rotation) {
    // Make a rectangle rotated the specified amount
    // in SVG path format.
    return `M ${Math.cos(rotation - spinnerWidth) * spinnerY1} ${
      Math.sin(rotation - spinnerWidth) * spinnerY1
    } L ${Math.cos(rotation + spinnerWidth) * spinnerY1} ${
      Math.sin(rotation + spinnerWidth) * spinnerY1
    } L ${Math.cos(rotation + spinnerWidth) * spinnerY2} ${
      Math.sin(rotation + spinnerWidth) * spinnerY2
    } L ${Math.cos(rotation - spinnerWidth) * spinnerY2} ${
      Math.sin(rotation - spinnerWidth) * spinnerY2
    } z`;
  }

  function makeSpinners() {
    // Make a group of spinners.
    const spinners = [];
    for (let i = 0; i < numSpinners; i++) {
      const rotation = (i / numSpinners) * 2 * Math.PI;
      spinners.push(makeSpinner(rotation));
    }
    return spinners;
  }

  const spinners = makeSpinners();
  let selectedSpinner = 0;

  let shouldAnimate = true;
  function animate() {
    selectedSpinner = Math.floor(Date.now() / INTERVAL) % spinners.length;
    if (shouldAnimate) {
      requestAnimationFrame(animate);
    }
  }

  onMount(() => {
    animate();
  });

  onDestroy(() => {
    shouldAnimate = false;
  });
</script>

<style lang="scss">
  svg {
    display: inline-block;
    vertical-align: middle;
  }
</style>

<svg
  width={15}
  height={15}
  viewBox="{-spinnerY2} {-spinnerY2} {spinnerY2 * 2} {spinnerY2 * 2}"
>
  {#each spinners as spinner, i}
    <path
      d={spinner}
      fill={selectedSpinner == i ? "black" : "gainsboro"}
      style="transition: fill 0.2s linear"
    />
  {/each}
</svg>
