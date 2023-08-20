<script lang="ts">
  export let unFocusedWidth = '50px';
  export let focusedWidth = '150px';
  export let text = '';

  let isFocused = false;

  function setFocused() {
    isFocused = true;
  }

  function unsetFocused() {
    isFocused = false;
  }

  $: width = isFocused ? focusedWidth : unFocusedWidth;
</script>

{#if isFocused}
  <div class="InputContainer" style:--width={width}>
    <df-text-input selected={true} readonly={true} value={text} on:blur={unsetFocused} />
  </div>
{:else}
  <span class="ShortenedText" style:--width={width} on:click|stopPropagation={setFocused}>
    {text}
  </span>
{/if}

<style>
  .ShortenedText {
    cursor: zoom-in;
    display: inline-block;
    width: var(--width);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }
  .InputContainer {
    display: inline-block;
    width: var(--width);
  }
</style>
