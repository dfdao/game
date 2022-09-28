import App from '../Pages/App.svelte';
import '../Styles/font/stylesheet.css';
import '../Styles/icomoon/style.css';
import '../Styles/preflight.css';
import '../Styles/style.css';

import { DarkForestTheme, DarkForestButton, DarkForestTextInput } from '@dfdao/ui';
customElements.define(DarkForestTheme.tagName, DarkForestTheme);
customElements.define(DarkForestButton.tagName, DarkForestButton);
customElements.define(DarkForestTextInput.tagName, DarkForestTextInput);

const target = document.getElementById('root');
if (!target) {
  throw new Error('Could not locate #root node');
}

const app = new App({ target });

export default app;
