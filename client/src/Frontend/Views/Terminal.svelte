<script lang="ts" context="module">
  import { afterUpdate, ComponentProps, ComponentType, SvelteComponent } from 'svelte';
  import { writable } from 'svelte/store';
  import dfstyles from '../Styles/dfstyles';
  import { isFirefox } from '../Utils/BrowserChecks';

  const history = writable<string[]>([]);

  type PromptCallback = (input: string) => void;

  const promptCallback = writable<PromptCallback | undefined>(undefined);

  type Fragment =
    | {
        type: 'element';
        tag: string;
        content?: string;
        color?: string;
        index: number;
      }
    | {
        type: 'component';
        ctor: ComponentType;
        content?: string;
        props?: Record<string, any>;
        index: number;
      };

  type MessageStyle = {
    color?: string;
  };

  let index = 0;

  function element(tag: string, content?: string, color?: string): Fragment {
    return { type: 'element', tag, content, color, index: index++ };
  }

  function component<C extends SvelteComponent>(
    ctor: ComponentType<C>,
    props?: ComponentProps<C>,
    content?: string
  ): Fragment {
    return { type: 'component', ctor, content, props: props ?? {}, index: index++ };
  }

  const fragments = writable<Fragment[]>([]);

  export function removeLast(n: number) {
    fragments.update((frags) => [...frags.slice(0, frags.length - n)]);
  }

  export function newline() {
    fragments.update((frags) => [...frags, element('br')]);
  }

  export function print(content: string, { color }: MessageStyle = {}) {
    fragments.update((frags) => [...frags, element('span', content, color)]);
  }

  export function println(content: string, { color }: MessageStyle = {}) {
    fragments.update((frags) => [...frags, element('span', content, color), element('br')]);
  }

  export function printComponent<C extends SvelteComponent>(
    ctor: ComponentType<C>,
    props?: ComponentProps<C>,
    content?: string
  ) {
    fragments.update((frags) => [...frags, component(ctor, props, content)]);
  }

  export function clear() {
    fragments.set([]);
  }

  export function prompt(cb: PromptCallback) {
    promptCallback.set(cb);
  }
</script>

<script lang="ts">
  let inputHeight = `1px`;

  let inputText: string | undefined = undefined;

  let containerRef: HTMLDivElement;
  let inputRef: HTMLTextAreaElement;

  const ENTER_KEY_CODE = 13;
  const UP_ARROW_KEY_CODE = 38;
  const DOWN_ARROW_KEY_CODE = 40;

  // We use -1 as then "empty" slot when scrolling through the history because accessing the -1
  // index in the history array returns `undefined`
  let historyIdx = -1;

  function onKeyUp(e: KeyboardEvent) {
    const callback = $promptCallback;

    if (callback === undefined) return;

    if (e.keyCode === ENTER_KEY_CODE && !e.shiftKey) {
      const userInput = inputText ?? '';
      // Reset everything before we callback since it could recurse sync
      inputText = '';
      historyIdx = -1;
      // We don't want to track empty input as a historical entry
      if (userInput) {
        history.update((hist) => [userInput, ...hist]);
      }
      $promptCallback = undefined;

      // Capture the input on screen
      print('$ ', { color: dfstyles.colors.dfgreen });
      // Since the textarea is offset, appending two spaces to newlines prints the same as when typing
      print(userInput.replaceAll('\n', '\n  '), { color: dfstyles.colors.text });
      newline();

      callback(userInput);
    } else if (e.keyCode === UP_ARROW_KEY_CODE) {
      historyIdx = Math.min(historyIdx + 1, $history.length - 1);
      inputText = $history[historyIdx];
    } else if (e.keyCode === DOWN_ARROW_KEY_CODE) {
      historyIdx = Math.max(historyIdx - 1, -1);
      inputText = $history[historyIdx];
    }
  }

  function preventEnterDefault(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.keyCode === ENTER_KEY_CODE && !e.shiftKey) {
      e.preventDefault();
    } else if (e.keyCode === UP_ARROW_KEY_CODE) {
      e.preventDefault();
    } else if (e.keyCode === DOWN_ARROW_KEY_CODE) {
      e.preventDefault();
    }
  }

  const onKeyPress = isFirefox() ? noop : preventEnterDefault;

  function noop() {}

  afterUpdate(() => {
    inputHeight = `${inputRef.scrollHeight}px`;
    if ($promptCallback) {
      inputRef.focus();
    }
    containerRef.scrollTo(0, containerRef.scrollHeight);
  });

  $: promptOpacity = $promptCallback ? 1 : 0;
</script>

<div class="TerminalContainer" bind:this={containerRef}>
  {#each $fragments as frag (frag.index)}
    {#if frag.type === 'element'}
      {#if frag.content}
        <svelte:element this={frag.tag} style:color={frag.color}>{frag.content}</svelte:element>
      {:else}
        <svelte:element this={frag.tag} style:color={frag.color} />
      {/if}
    {:else if frag.content}
      <svelte:component this={frag.ctor} {...frag.props}>{frag.content}</svelte:component>
    {:else}
      <svelte:component this={frag.ctor} {...frag.props} />
    {/if}
  {/each}
  <div class="Prompt" style:--prompt-opacity={promptOpacity}>
    <span class="PromptCharacter">$&nbsp;</span>
    <div class="TextAreas">
      <textarea
        class="InputTextArea"
        style:--height={inputHeight}
        bind:this={inputRef}
        bind:value={inputText}
        on:keyup|preventDefault|stopPropagation={onKeyUp}
        on:keydown={preventEnterDefault}
        on:keypress={onKeyPress}
        disabled={$promptCallback === undefined}
      />
    </div>
  </div>
</div>

<style>
  .TerminalContainer {
    height: 100%;
    width: 100%;
    margin: 0 auto;
    overflow: scroll;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }

  .Prompt {
    display: flex;
    justify-content: flex-start;
    flex-direction: row;
    opacity: var(--prompt-opacity);
  }

  .PromptCharacter {
    color: var(--df-colors-dfgreen);
  }

  .TextAreas {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    width: 100%;
  }

  .InputTextArea {
    background: none;
    outline: none;
    border: none;
    color: var(--df-colors-text);
    height: var(--height);
    resize: none;
    /* flex-grow: ${height === 0 ? 0 : 1}; */
    flex-grow: 1;
  }

  /* TODO: Size variable */
  @media (max-width: 660px) {
    .TerminalContainer {
      font-size: var(--df-font-size-xs);
    }
  }
</style>
