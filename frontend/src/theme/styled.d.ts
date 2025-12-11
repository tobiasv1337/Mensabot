import 'styled-components';
import type { Theme } from './theme/colors'; // anpassen falls Pfad anders ist

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}
