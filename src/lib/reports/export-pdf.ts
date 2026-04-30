"use client";

import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";

const SLIDE_EXPORT_WIDTH = 1160;
const SLIDE_EXPORT_HEIGHT = 670;
const SLIDE_EXPORT_BACKGROUND = "#0b1d2a";
const SLIDE_RENDER_DELAY_MS = 50;

function buildPdfFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `measurable-report-${year}-${month}-${day}.pdf`;
}

function getReportSlideElements(slidesContainer: HTMLElement) {
  return Array.from(
    slidesContainer.querySelectorAll<HTMLElement>("[data-report-slide]")
  );
}

function lockSlideExportSize(slideElement: HTMLElement) {
  const previousWidth = slideElement.style.width;
  const previousMinWidth = slideElement.style.minWidth;
  const previousMaxWidth = slideElement.style.maxWidth;
  const previousHeight = slideElement.style.height;
  const previousMinHeight = slideElement.style.minHeight;
  const previousMaxHeight = slideElement.style.maxHeight;
  const previousTransform = slideElement.style.transform;

  slideElement.style.width = `${SLIDE_EXPORT_WIDTH}px`;
  slideElement.style.minWidth = `${SLIDE_EXPORT_WIDTH}px`;
  slideElement.style.maxWidth = `${SLIDE_EXPORT_WIDTH}px`;
  slideElement.style.height = `${SLIDE_EXPORT_HEIGHT}px`;
  slideElement.style.minHeight = `${SLIDE_EXPORT_HEIGHT}px`;
  slideElement.style.maxHeight = `${SLIDE_EXPORT_HEIGHT}px`;
  slideElement.style.transform = "none";

  return () => {
    slideElement.style.width = previousWidth;
    slideElement.style.minWidth = previousMinWidth;
    slideElement.style.maxWidth = previousMaxWidth;
    slideElement.style.height = previousHeight;
    slideElement.style.minHeight = previousMinHeight;
    slideElement.style.maxHeight = previousMaxHeight;
    slideElement.style.transform = previousTransform;
  };
}

async function waitForSlideImages(slideElement: HTMLElement) {
  const images = Array.from(slideElement.querySelectorAll<HTMLImageElement>("img"));

  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const handleDone = () => {
          image.removeEventListener("load", handleDone);
          image.removeEventListener("error", handleDone);
          resolve();
        };

        image.addEventListener("load", handleDone, { once: true });
        image.addEventListener("error", handleDone, { once: true });
      });
    })
  );
}

async function waitBetweenSlides() {
  await new Promise((resolve) => {
    window.setTimeout(resolve, SLIDE_RENDER_DELAY_MS);
  });
}

export async function renderReportSlidesToImages(
  slidesContainer: HTMLElement,
  options?: {
    onProgress?: (current: number, total: number) => void;
  }
) {
  const slideElements = getReportSlideElements(slidesContainer);

  if (slideElements.length === 0) {
    throw new Error("No report slides found for image export");
  }

  const images: string[] = [];

  for (const [index, slideElement] of slideElements.entries()) {
    const unlockSlideSize = lockSlideExportSize(slideElement);

    try {
      await waitForSlideImages(slideElement);

      const image = await toJpeg(slideElement, {
        pixelRatio: 1.5,
        quality: 0.92,
        cacheBust: true,
        backgroundColor: SLIDE_EXPORT_BACKGROUND,
        width: SLIDE_EXPORT_WIDTH,
        height: SLIDE_EXPORT_HEIGHT,
        canvasWidth: SLIDE_EXPORT_WIDTH,
        canvasHeight: SLIDE_EXPORT_HEIGHT,
      });

      images.push(image);
      options?.onProgress?.(index + 1, slideElements.length);

      if (index < slideElements.length - 1) {
        await waitBetweenSlides();
      }
    } finally {
      unlockSlideSize();
    }
  }

  return images;
}

export async function exportReportPdf(
  slidesContainer: HTMLElement,
  options?: {
    onProgress?: (current: number, total: number) => void;
  }
) {
  const images = await renderReportSlidesToImages(slidesContainer, options);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [SLIDE_EXPORT_WIDTH, SLIDE_EXPORT_HEIGHT],
    compress: true,
  });

  images.forEach((image, index) => {
    if (index > 0) {
      pdf.addPage([SLIDE_EXPORT_WIDTH, SLIDE_EXPORT_HEIGHT], "landscape");
    }

    pdf.addImage(
      image,
      "JPEG",
      0,
      0,
      SLIDE_EXPORT_WIDTH,
      SLIDE_EXPORT_HEIGHT,
      undefined,
      "FAST"
    );
  });

  pdf.save(buildPdfFilename());
}
