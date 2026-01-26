import 'unplugin-icons/types/svelte';
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
  declare module '*?shiki' {
    const src: string;
    export default src;
  }

  declare module '*?marked' {
    const src: string;
    export default src;
  }
}

export {};
