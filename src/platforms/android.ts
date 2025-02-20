import escapeHtml from "escape-html";
import { FaviconFile, FaviconHtmlElement, FaviconImage } from "../index.js";
import { FaviconOptions, IconOptions } from "../config/defaults.js";
import { maskable, transparentIcon } from "../config/icons.js";
import {
  Dictionary,
  Images,
  relativeTo,
  SourceImage,
  sourceImages,
} from "../helpers.js";
import { Platform, uniformIconOptions } from "./base.js";

const ICONS_OPTIONS: Dictionary<IconOptions> = {
  "android-chrome-36x36.png": transparentIcon(36),
  "android-chrome-48x48.png": transparentIcon(48),
  "android-chrome-72x72.png": transparentIcon(72),
  "android-chrome-96x96.png": transparentIcon(96),
  "android-chrome-144x144.png": transparentIcon(144),
  "android-chrome-192x192.png": transparentIcon(192),
  "android-chrome-256x256.png": transparentIcon(256),
  "android-chrome-384x384.png": transparentIcon(384),
  "android-chrome-512x512.png": transparentIcon(512),
};

const ICONS_OPTIONS_MASKABLE: Dictionary<IconOptions> = {
  "android-chrome-maskable-36x36.png": maskable(transparentIcon(36)),
  "android-chrome-maskable-48x48.png": maskable(transparentIcon(48)),
  "android-chrome-maskable-72x72.png": maskable(transparentIcon(72)),
  "android-chrome-maskable-96x96.png": maskable(transparentIcon(96)),
  "android-chrome-maskable-144x144.png": maskable(transparentIcon(144)),
  "android-chrome-maskable-192x192.png": maskable(transparentIcon(192)),
  "android-chrome-maskable-256x256.png": maskable(transparentIcon(256)),
  "android-chrome-maskable-384x384.png": maskable(transparentIcon(384)),
  "android-chrome-maskable-512x512.png": maskable(transparentIcon(512)),
};

export class AndroidPlatform extends Platform {
  constructor(options: FaviconOptions) {
    super(
      options,
      uniformIconOptions(options, options.icons.android, ICONS_OPTIONS)
    );
  }

  async createImages(sourceset: SourceImage[]): Promise<FaviconImage[]> {
    const images = new Images();

    let icons = await Promise.all(
      Object.entries(this.iconOptions).map(([iconName, iconOption]) =>
        images.createFavicon(sourceset, iconName, iconOption)
      )
    );

    // Generate android maskable images from a different source set
    if (
      this.options.manifestMaskable &&
      typeof this.options.manifestMaskable !== "boolean"
    ) {
      const maskableSourceset = await sourceImages(
        this.options.manifestMaskable
      );

      const maskable = await Promise.all(
        Object.entries(ICONS_OPTIONS_MASKABLE).map(([iconName, iconOption]) =>
          images.createFavicon(maskableSourceset, iconName, iconOption)
        )
      );

      icons = [...icons, ...maskable];
    }

    return icons;
  }

  async createFiles(): Promise<FaviconFile[]> {
    return [this.manifest()];
  }

  async createHtml(): Promise<FaviconHtmlElement[]> {
    // prettier-ignore
    return [
      this.options.loadManifestWithCredentials
        ? `<link rel="manifest" href="${this.relative(this.manifestFileName())}" crossOrigin="use-credentials">`
        : `<link rel="manifest" href="${this.relative(this.manifestFileName())}">`,
      `<meta name="mobile-web-app-capable" content="yes">`,
      `<meta name="theme-color" content="${this.options.theme_color || this.options.background}">`,
      this.options.appName
        ? `<meta name="application-name" content="${escapeHtml(this.options.appName)}">`
        : `<meta name="application-name">`,
    ];
  }

  private manifestFileName(): string {
    return (
      this.options.files?.android?.manifestFileName ?? "manifest.webmanifest"
    );
  }

  private manifest(): FaviconFile {
    const { options } = this;
    const basePath = options.manifestRelativePaths ? null : options.path;

    const properties: Dictionary<unknown> = {
      name: options.appName,
      short_name: options.appShortName || options.appName,
      description: options.appDescription,
      dir: options.dir,
      lang: options.lang,
      display: options.display,
      orientation: options.orientation,
      scope: options.scope,
      start_url: options.start_url,
      background_color: options.background,
      theme_color: options.theme_color,
    };

    // Defaults to false, so omit the value https://developer.mozilla.org/en-US/docs/Web/Manifest/prefer_related_applications
    if (options.preferRelatedApplications) {
      properties.prefer_related_applications =
        options.preferRelatedApplications;
    }
    // Only include related_applications if a lengthy array is provided.
    if (
      Array.isArray(options.relatedApplications) &&
      options.relatedApplications.length > 0
    ) {
      properties.related_applications = options.relatedApplications;
    }

    let icons = this.iconOptions;

    // If manifestMaskable is set but is not a boolean
    // assume a file (or an array) is passed, and we should link
    // the generated files with maskable as purpose.
    if (
      options.manifestMaskable &&
      typeof options.manifestMaskable !== "boolean"
    ) {
      icons = {
        ...icons,
        ...ICONS_OPTIONS_MASKABLE,
      };
    }

    const defaultPurpose =
      options.manifestMaskable === true ? "any maskable" : "any";

    properties.icons = Object.entries(icons).map(([name, iconOptions]) => {
      const { width, height } = iconOptions.sizes[0];

      return {
        src: relativeTo(basePath, name),
        sizes: `${width}x${height}`,
        type: "image/png",
        purpose: iconOptions.purpose ?? defaultPurpose,
      };
    });

    return {
      name: this.manifestFileName(),
      contents: JSON.stringify(properties, null, 2),
    };
  }
}
