/**
 * Type declaration for CSS Module imports.
 * Allows TypeScript to understand `.module.css` imports without errors.
 */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
