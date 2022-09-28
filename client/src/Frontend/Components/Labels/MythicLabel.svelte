<script lang="ts">
  export let text: string;
</script>

<span class="Anim">
  {#each text as c, i}
    <span class="AnimDelay" style:--index={-i}>
      {c}
    </span>
  {/each}
</span>

<style>
  @keyframes color {
    0% {
      filter: hue-rotate(0);
    }
    30% {
      filter: hue-rotate(0);
    }
    100% {
      filter: hue-rotate(360deg);
    }
  }

  .Anim {
    color: var(--df-colors-artifact-rarity-mythic);
  }

  .AnimDelay {
    animation: color 1s ease-in-out infinite alternate;
    animation-delay: calc(var(--index) * 0.04s);
  }
</style>
