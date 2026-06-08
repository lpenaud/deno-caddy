export interface DateTimeFormatFactoryOptions {
  locales: Intl.LocalesArgument;
  options: Intl.DateTimeFormatOptions;
}

export class DateTimeFormatFactory {
  static #instance = new DateTimeFormatFactory({
    locales: "fr-FR",
    options: {
      timeZone: "Europe/Paris",
    },
  });

  static get instance(): DateTimeFormatFactory {
    return this.#instance;
  }

  #locales: Intl.LocalesArgument;

  #options: Intl.DateTimeFormatOptions;

  constructor(options: Partial<DateTimeFormatFactoryOptions> = {}) {
    this.#locales = options.locales;
    this.#options = options.options ?? {};
  }

  get(options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat(this.#locales, {
      ...this.#options,
      ...options,
    });
  }

  shortDateTime() {
    return this.get({
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  shortTime() {
    return this.get({
      timeStyle: "short",
    });
  }
}
