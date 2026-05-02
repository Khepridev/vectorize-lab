declare module "imagetracerjs" {
  export interface ImageTracerOptions {
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    rightangleenhance?: boolean;
    linefilter?: boolean;
    colorsampling?: number;
    numberofcolors?: number;
    mincolorratio?: number;
    colorquantcycles?: number;
    strokewidth?: number;
    layering?: number;
    blurradius?: number;
    blurdelta?: number;
    scale?: number;
    roundcoords?: number;
    viewbox?: boolean;
  }

  export interface ImageTracerApi {
    imageToSVG: (
      url: string,
      callback: (svgString: string) => void,
      options?: ImageTracerOptions
    ) => void;
  }

  const ImageTracer: ImageTracerApi;
  export default ImageTracer;
}
