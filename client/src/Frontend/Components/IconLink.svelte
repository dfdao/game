<script lang="ts">
  import dfstyles from '../Styles/dfstyles';

  export let to: string;
  export let icon: keyof typeof dfstyles.colors.icons;

  let color = dfstyles.colors.dfwhite;
  $: hoverColor = dfstyles.colors.icons[icon];
</script>

<a style:--link-color={color} style:--link-hover-color={hoverColor} href={to}>
  <span class="icon-{icon}" />
</a>

<style>
  a {
    display: flex;
    justify-content: center;
    align-items: center;

    cursor: pointer;
    transition: color 0.2s;
    color: var(--link-color);
  }

  a:hover {
    color: var(--link-hover-color);
  }

  .icon-twitter:before {
    content: '\e901';
  }
  .icon-github:before {
    content: '\e903';
  }
  .icon-discord:before {
    content: '\e900';
  }
  .icon-email:before {
    content: '\e902';
  }
  .icon-blog:before {
    /* TODO: Blog icon*/
  }
</style>
