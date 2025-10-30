class Plugin {
  registeredPlugins = [];
  #title;
  #version;
  constructor(title, version) {
    this.#title = title;
    this.#version = version;
  }
  static registerPlugins(plugin) {
    plugin.registeredPlugins.push(plugin);
  }
  get title() {
    return this.#title;
  }
  get version() {
    return this.#version;
  }
}
export {
  Plugin
};
//# sourceMappingURL=plugin.js.map