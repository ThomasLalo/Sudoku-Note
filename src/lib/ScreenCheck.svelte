<script>
  import { onMount } from 'svelte';
  
  let innerWidth = $state(0);
  let innerHeight = $state(0);
  let screenWidth = $state(0);
  let screenHeight = $state(0);
  
  let isMobile = $derived(innerWidth < 768);
  let isTablet = $derived(innerWidth >= 768 && innerWidth < 1024);
  let isDesktop = $derived(innerWidth >= 1024);
  
  onMount(() => {
    screenWidth = screen.width;
    screenHeight = screen.height;
  });
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="debug">
  Viewport: {innerWidth}px × {innerHeight}px<br>
  Screen: {screenWidth}px × {screenHeight}px<br>
  Mobile: {isMobile}<br>
  Tablet: {isTablet}<br>
  Desktop: {isDesktop}
</div>