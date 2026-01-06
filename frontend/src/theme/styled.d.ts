import 'styled-components';
import { Theme } from './colors';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}
