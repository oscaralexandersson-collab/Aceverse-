
import PptxGenJS from 'pptxgenjs';

export const defineMasters = (pptx: PptxGenJS, theme: any) => {
  // Editorial Aesthetic Colors
  const palette = theme?.palette || { primary: '1A1C18', background: 'ECE3D0', accent: '5E6D5E' };
  const darkBg = '1A1C18';
  const lightText = 'ECE3D0';
  const sageAccent = '5E6D5E';
  
  // Master 1: HERO TITLE (High-Impact Editorial)
  pptx.defineSlideMaster({
    title: 'MASTER_TITLE_HERO',
    background: { color: darkBg },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 1.5, w: '90%', h: 2.5, fontSize: 80, bold: true, color: lightText, align: 'left', fontFace: 'Playfair Display', charSpacing: -2 } } },
      { placeholder: { options: { name: 'subtitle', type: 'body', x: 0.5, y: 3.8, w: '90%', h: 0.5, fontSize: 20, color: lightText, align: 'left', fontFace: 'Inter', transparency: 30, italic: true } } },
      // Bottom Metadata Bar
      { rect: { x: 0.5, y: 5.0, w: 9.0, h: 0.02, fill: { color: lightText }, transparency: 80 } },
      { text: { text: '2025', options: { x: 0.5, y: 5.1, w: 1.0, fontSize: 10, color: lightText, fontFace: 'Inter', bold: true } } },
      { text: { text: 'ACEVERSE STRATEGY', options: { x: 7.0, y: 5.1, w: 2.5, fontSize: 10, color: lightText, fontFace: 'Inter', align: 'right', bold: true } } }
    ]
  });

  // Master 2: SECTION DIVIDER (Minimalist)
  pptx.defineSlideMaster({
    title: 'MASTER_SECTION_DIVIDER',
    background: { color: darkBg },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 2.0, w: '90%', h: 1.5, fontSize: 64, bold: true, color: lightText, align: 'center', fontFace: 'Playfair Display' } } },
      { shape: pptx.ShapeType.rtArrow, options: { x: 4.5, y: 3.5, w: 1, h: 0.4, fill: { color: sageAccent } } }
    ]
  });

  // Master 3: BULLETS (Asymmetric Layout)
  pptx.defineSlideMaster({
    title: 'MASTER_BULLETS',
    background: { color: darkBg },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.4, w: '90%', h: 1.2, fontSize: 44, bold: true, color: lightText, fontFace: 'Playfair Display', align: 'left' } } },
      { rect: { x: 0.5, y: 1.6, w: 2.0, h: 0.05, fill: { color: sageAccent } } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.5, y: 2.2, w: '85%', h: 2.8, fontSize: 18, color: lightText, fontFace: 'Inter', align: 'left', lineSpacing: 28 } } },
      { text: { text: 'INTERNAL USE ONLY // RESEARCH DATA', options: { x: 0.5, y: 5.2, w: 4, fontSize: 8, color: sageAccent, fontFace: 'Inter', bold: true } } }
    ]
  });

  // Master 4: TWO COLUMN (Split Screen)
  pptx.defineSlideMaster({
    title: 'MASTER_TWO_COLUMN',
    background: { color: darkBg },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.3, w: '90%', h: 0.8, fontSize: 38, bold: true, color: lightText, fontFace: 'Playfair Display' } } },
      { rect: { x: 5.0, y: 1.5, w: 0.01, h: 3.5, fill: { color: lightText }, transparency: 80 } },
      { placeholder: { options: { name: 'left', type: 'body', x: 0.5, y: 1.5, w: 4.2, h: 3.5, fontSize: 16, color: lightText } } },
      { placeholder: { options: { name: 'right', type: 'body', x: 5.3, y: 1.5, w: 4.2, h: 3.5, fontSize: 16, color: lightText } } }
    ]
  });

  // Master 5: KPI (Infographic Style)
  pptx.defineSlideMaster({
    title: 'MASTER_KPI_3UP',
    background: { color: darkBg },
    objects: [
        { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.4, w: '90%', h: 0.8, fontSize: 40, bold: true, color: lightText, fontFace: 'Playfair Display' } } },
        { shape: pptx.ShapeType.ellipse, options: { x: 8.5, y: 0.5, w: 1.0, h: 1.0, fill: { color: sageAccent }, transparency: 50 } }
    ]
  });
};
