<script lang="ts">
  import colors from 'color';
  import dfstyles from '../Styles/dfstyles';

  export let to: string;
  export let openNewTab = false;
  export let color: string = dfstyles.colors.dfblue;
  export let hoverColor: string | undefined = undefined;

  $: hoverColor = hoverColor ?? colors(color).lighten(0.3).hex();
  $: target = openNewTab ? '_blank' : undefined;
</script>

<a style:--link-color={color} style:--link-hover-color={hoverColor} href={to} {target}><slot /></a>

<style>
  a {
    cursor: pointer;
    text-decoration: underline;
    color: var(--link-color);
  }

  a:hover {
    color: var(--link-hover-color);
  }
</style>
