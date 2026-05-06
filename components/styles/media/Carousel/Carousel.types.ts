/**
 * Local types for the Carousel style.
 */

export interface ICarouselSource {
    src: string;
    alt?: string;
    type?: string;
    /**
     * Index signature kept open so the upstream `IAssetSource` shape
     * stays compatible (the backend may add fields like `width`,
     * `height`, `mime`, etc.).
     */
    [extra: string]: unknown;
}
