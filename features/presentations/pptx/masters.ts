
import PptxGenJS from 'pptxgenjs';

export const defineMasters = (pptx: PptxGenJS) => {
  const colors = {
    blueDark: '0F172A',
    blueMain: '2563EB',
    indigo: '4F46E5',
    white: 'FFFFFF',
    glass: 'FFFFFF22' // Semi-transparent for glass effect
  };

  const titleFont = 'Inter';

  // Master: SALFORD_TITLE
  pptx.defineSlideMaster({
    title: 'SALFORD_TITLE',
    background: { color: colors.blueDark },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: '100%', fill: { type: 'gradient', color: [colors.blueDark, colors.indigo], rotate: 45 } } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 2.0, w: '90%', h: 3.0, fontSize: 96, bold: true, color: colors.white, align: 'left', fontFace: titleFont } } },
      { placeholder: { options: { name: 'subtitle', type: 'body', x: 0.5, y: 5.0, w: 4.0, h: 0.5, fontSize: 14, color: colors.blueMain, align: 'left', fontFace: titleFont, bold: true } } },
      // Decorative "Glass" Circle
      { shape: pptx.ShapeType.ellipse, options: { x: 7.0, y: -1.0, w: 5.0, h: 5.0, fill: { color: colors.glass }, line: { color: colors.white, width: 1, alpha: 0.2 } } }
    ]
  });

  // Master: SALFORD_CONTENT (Standard Salford layout)
  pptx.defineSlideMaster({
    title: 'SALFORD_CONTENT',
    background: { color: colors.blueDark },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: '100%', fill: { type: 'gradient', color: [colors.blueDark, colors.indigo], rotate: 45 } } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.4, w: 8.0, h: 1.0, fontSize: 54, bold: true, color: colors.white, fontFace: titleFont, italic: true } } },
      { rect: { x: 0.5, y: 1.5, w: 9.0, h: 3.5, fill: { color: colors.glass }, line: { color: colors.white, width: 1, alpha: 0.1 } } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 1.8, w: 8.4, h: 3.0, fontSize: 18, color: colors.white, fontFace: titleFont } } }
    ]
  });

  // Master: SALFORD_THANK_YOU
  pptx.defineSlideMaster({
    title: 'SALFORD_THANK_YOU',
    background: { color: colors.blueDark },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: '100%', fill: { type: 'gradient', color: [colors.indigo, colors.blueDark], rotate: 45 } } },
      { text: { text: 'Thank You', options: { x: 0.5, y: 2.0, w: 9.0, h: 2.0, fontSize: 120, bold: true, color: colors.white, align: 'center', fontFace: titleFont } } },
      { rect: { x: 2.5, y: 4.5, w: 5.0, h: 1.0, fill: { color: colors.glass }, line: { color: colors.white, width: 1, alpha: 0.2 } } }
    ]
  });
};
