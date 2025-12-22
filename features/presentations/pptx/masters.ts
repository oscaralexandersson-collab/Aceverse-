
import PptxGenJS from 'pptxgenjs';

export const defineMasters = (pptx: PptxGenJS, theme: any) => {
  const { palette } = theme;
  
  // Master 1: HERO TITLE
  pptx.defineSlideMaster({
    title: 'MASTER_TITLE_HERO',
    background: { color: palette.background },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: '100%', fill: { color: palette.primary } } },
      { placeholder: { name: 'title', type: 'title', x: 0.5, y: 2.0, w: '90%', h: 1.5, fontSize: 54, bold: true, color: 'FFFFFF', align: 'center' } },
      { placeholder: { name: 'subtitle', type: 'body', x: 0.5, y: 3.6, w: '90%', h: 0.5, fontSize: 24, color: 'FFFFFF', align: 'center', transparency: 20 } }
    ]
  });

  // Master 2: SECTION DIVIDER
  pptx.defineSlideMaster({
    title: 'MASTER_SECTION_DIVIDER',
    background: { color: palette.primary },
    objects: [
      { placeholder: { name: 'title', type: 'title', x: 0.5, y: 2.2, w: '90%', h: 1.2, fontSize: 48, bold: true, color: 'FFFFFF', align: 'center' } },
      { rect: { x: 4.5, y: 3.5, w: 1, h: 0.05, fill: { color: 'FFFFFF' } } }
    ]
  });

  // Master 3: BULLETS (Standard Content)
  pptx.defineSlideMaster({
    title: 'MASTER_BULLETS',
    background: { color: palette.background },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: palette.primary } } },
      { placeholder: { name: 'title', type: 'title', x: 0.5, y: 0.1, w: '90%', h: 0.6, fontSize: 32, bold: true, color: 'FFFFFF' } },
      { placeholder: { name: 'body', type: 'body', x: 0.8, y: 1.4, w: '85%', h: 3.5, fontSize: 18, color: palette.primary } },
      { text: { text: '© Aceverse AI', options: { x: 0.5, y: 5.2, w: 2, fontSize: 8, color: '999999' } } },
      { text: { text: 'Slide ', options: { x: 9, y: 5.2, w: 0.5, fontSize: 8, color: '999999', align: 'right' } } }
    ]
  });

  // Master 4: TWO COLUMN
  pptx.defineSlideMaster({
    title: 'MASTER_TWO_COLUMN',
    background: { color: palette.background },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: palette.primary } } },
      { placeholder: { name: 'title', type: 'title', x: 0.5, y: 0.1, w: '90%', h: 0.6, fontSize: 32, bold: true, color: 'FFFFFF' } },
      { placeholder: { name: 'left', type: 'body', x: 0.5, y: 1.5, w: 4.5, h: 3.5, fontSize: 16 } },
      { placeholder: { name: 'right', type: 'body', x: 5.2, y: 1.5, w: 4.5, h: 3.5, fontSize: 16 } },
      { line: { x: 5, y: 1.5, w: 0, h: 3.5, line: { color: 'EEEEEE', width: 1 } } }
    ]
  });

  // Master 5: KPI 3-UP
  pptx.defineSlideMaster({
    title: 'MASTER_KPI_3UP',
    background: { color: palette.background },
    objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: palette.primary } } },
        { placeholder: { name: 'title', type: 'title', x: 0.5, y: 0.1, w: '90%', h: 0.6, fontSize: 32, bold: true, color: 'FFFFFF' } }
    ]
  });

  // (Implementering av övriga masters följer samma mönster...)
};
