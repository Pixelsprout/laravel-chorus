declare module "alpinejs" {
  export interface Alpine {
    /**
     * Register a magic property
     */
    magic(name: string, callback: (el?: HTMLElement) => any): void;

    /**
     * Register a directive
     */
    directive(name: string, callback: (el: HTMLElement, directive: any, utilities: any) => void): void;

    /**
     * Make an object reactive
     */
    reactive<T extends object>(obj: T): T;

    /**
     * Start Alpine
     */
    start(): void;

    /**
     * Register a plugin
     */
    plugin(plugin: (alpine: Alpine) => void): void;

    /**
     * Create an Alpine store
     */
    store(name: string, value?: any): any;
  }

  const Alpine: Alpine;
  export default Alpine;
}
