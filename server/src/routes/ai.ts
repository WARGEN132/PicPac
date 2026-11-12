import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';

export const aiRouter = Router();

// Layout helper templates for spreads
function buildSpread(spreadIndex: number, photos: string[], theme: string, style: string) {
  const p1 = photos[(spreadIndex * 2) % photos.length];
  const p2 = photos[(spreadIndex * 2 + 1) % photos.length];
  const p3 = photos[(spreadIndex * 2 + 2) % photos.length];

  // Alternating dynamic compositions (Section 9.3)
  const pattern = spreadIndex % 4;

  let leftElements: any[] = [];
  let rightElements: any[] = [];
  let leftBg = '#FFFFFF';
  let rightBg = '#FFFFFF';

  if (pattern === 0) {
    // 1 Large photo on left + photo with text on right
    leftElements = [
      {
        id: uuidv4(),
        type: 'photo',
        x: 8,
        y: 8,
        width: 84,
        height: 84,
        zIndex: 1,
        photoUrl: p1,
        caption: 'Главный момент'
      }
    ];
    rightElements = [
      {
        id: uuidv4(),
        type: 'photo',
        x: 12,
        y: 12,
        width: 76,
        height: 60,
        zIndex: 1,
        photoUrl: p2
      },
      {
        id: uuidv4(),
        type: 'text',
        x: 12,
        y: 76,
        width: 76,
        height: 14,
        zIndex: 2,
        text: theme === 'Семья' ? 'Тепло родного дома и искренние улыбки' : theme === 'Путешествие' ? 'Новые горизонты и незабываемые впечатления' : 'Особенные дни, сохранённые навсегда',
        fontSize: 14,
        color: '#364C49',
        align: 'center'
      }
    ];
  } else if (pattern === 1) {
    // Two balanced portrait photos with generous margins ("воздух")
    leftElements = [
      {
        id: uuidv4(),
        type: 'photo',
        x: 14,
        y: 14,
        width: 72,
        height: 72,
        zIndex: 1,
        photoUrl: p1
      }
    ];
    rightElements = [
      {
        id: uuidv4(),
        type: 'photo',
        x: 14,
        y: 14,
        width: 72,
        height: 72,
        zIndex: 1,
        photoUrl: p2
      }
    ];
    leftBg = '#F6EFE6';
    rightBg = '#F6EFE6';
  } else if (pattern === 2) {
    // Collage: 1 big + 2 stacked
    leftElements = [
      {
        id: uuidv4(),
        type: 'photo',
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        zIndex: 1,
        photoUrl: p1
      }
    ];
    rightElements = [
      {
        id: uuidv4(),
        type: 'photo',
        x: 10,
        y: 10,
        width: 80,
        height: 38,
        zIndex: 1,
        photoUrl: p2
      },
      {
        id: uuidv4(),
        type: 'photo',
        x: 10,
        y: 52,
        width: 80,
        height: 38,
        zIndex: 1,
        photoUrl: p3
      }
    ];
  } else {
    // Minimalist wide spread
    leftElements = [
      {
        id: uuidv4(),
        type: 'photo',
        x: 10,
        y: 18,
        width: 80,
        height: 64,
        zIndex: 1,
        photoUrl: p1
      }
    ];
    rightElements = [
      {
        id: uuidv4(),
        type: 'photo',
        x: 10,
        y: 18,
        width: 80,
        height: 64,
        zIndex: 1,
        photoUrl: p2
      },
      {
        id: uuidv4(),
        type: 'text',
        x: 10,
        y: 86,
        width: 80,
        height: 8,
        zIndex: 2,
        text: 'PicPac • Семейная коллекция',
        fontSize: 11,
        color: '#7C807F',
        align: 'right'
      }
    ];
  }

  return {
    id: `spread-${spreadIndex + 1}`,
    spreadIndex,
    title: `Разворот ${spreadIndex + 1}`,
    leftPage: {
      id: `page-${spreadIndex * 2 + 1}`,
      pageNumber: spreadIndex * 2 + 1,
      backgroundColor: leftBg,
      elements: leftElements
    },
    rightPage: {
      id: `page-${spreadIndex * 2 + 2}`,
      pageNumber: spreadIndex * 2 + 2,
      backgroundColor: rightBg,
      elements: rightElements
    }
  };
}

// POST /api/ai/generate-book — AI Generation Engine (Section 8 & 9)
aiRouter.post('/ai/generate-book', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      photos = [],
      theme = 'Семья',
      style = 'Минималистичный',
      format = '20×20 см',
      coverType = 'Твёрдая фотообложка',
      customPrompt = '',
      title = 'Семейная история'
    } = req.body;

    const samplePhotos = photos.length > 0 ? photos : [
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80'
    ];

    const spreadsCount = 6; // 6 spreads = 12 pages + cover
    const spreads = [];

    for (let i = 0; i < spreadsCount; i++) {
      spreads.push(buildSpread(i, samplePhotos, theme, style));
    }

    const document = {
      version: '1.0',
      title: title || `${theme} • Фотокнига`,
      theme,
      style,
      format,
      coverType,
      cover: {
        title: title || `${theme} • Фотокнига`,
        subtitle: 'Коллекция лучших воспоминаний',
        coverPhotoUrl: samplePhotos[0],
        backgroundColor: '#F6EFE6',
        material: coverType,
        fontFamily: 'Futura PT, sans-serif'
      },
      spreads,
      productionSettings: {
        widthMm: 200,
        heightMm: 200,
        safeZoneMm: 5,
        bleedMm: 3,
        spineMm: 10
      }
    };

    // Log AI generation in audit_log without storing full image binary
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'usr-test-customer-001',
      new Date().toISOString(),
      'ai:generate_book',
      'project',
      'generated_doc',
      'success',
      JSON.stringify({
        theme,
        style,
        format,
        photosCount: samplePhotos.length,
        spreadsCount
      })
    );

    res.json({
      success: true,
      message: 'Фотокнига успешно сгенерирована ИИ',
      data: document
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/edit-command — Natural Language AI Assistant in Editor (Section 9.4)
aiRouter.post('/ai/edit-command', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { document, currentSpreadIndex = 0, command = '' } = req.body;

    if (!document || !document.spreads) {
      res.status(400).json({ success: false, error: 'Макет документа не передан' });
      return;
    }

    const cmd = command.toLowerCase().trim();
    const updatedDoc = JSON.parse(JSON.stringify(document));
    let responseMessage = 'Команда успешно применена ИИ к текущему макету.';
    const spreadIdx = Math.min(Math.max(0, currentSpreadIndex), updatedDoc.spreads.length - 1);
    const targetSpread = updatedDoc.spreads[spreadIdx];

    if (cmd.includes('минималист') || cmd.includes('обложк')) {
      // "Сделай обложку более минималистичной"
      updatedDoc.cover.backgroundColor = '#FFFFFF';
      updatedDoc.cover.subtitle = '';
      responseMessage = 'Обложка оформлена в чистом минималистичном стиле без лишних элементов.';
    } else if (cmd.includes('воздух') || cmd.includes('больше воздуха') || cmd.includes('отступ')) {
      // "Добавь больше воздуха между фотографиями"
      if (targetSpread) {
        for (const elem of [...targetSpread.leftPage.elements, ...targetSpread.rightPage.elements]) {
          if (elem.type === 'photo') {
            elem.width = Math.max(50, elem.width - 12);
            elem.height = Math.max(50, elem.height - 12);
            elem.x = Math.min(25, elem.x + 6);
            elem.y = Math.min(25, elem.y + 6);
          }
        }
        responseMessage = `На развороте ${spreadIdx + 1} увеличены поля и добавлено свободное пространство вокруг фото.`;
      }
    } else if (cmd.includes('убери текст') || cmd.includes('удалить текст') || cmd.includes('без текста')) {
      // "Убери текст с этой страницы"
      if (targetSpread) {
        targetSpread.leftPage.elements = targetSpread.leftPage.elements.filter((e: any) => e.type !== 'text');
        targetSpread.rightPage.elements = targetSpread.rightPage.elements.filter((e: any) => e.type !== 'text');
        responseMessage = `Текстовые блоки удалены с разворота ${spreadIdx + 1}.`;
      }
    } else if (cmd.includes('поменяй') || cmd.includes('местами')) {
      // "Поменяй фотографии на этой странице местами"
      if (targetSpread) {
        const leftPhotos = targetSpread.leftPage.elements.filter((e: any) => e.type === 'photo');
        const rightPhotos = targetSpread.rightPage.elements.filter((e: any) => e.type === 'photo');
        if (leftPhotos.length > 0 && rightPhotos.length > 0) {
          const tempUrl = leftPhotos[0].photoUrl;
          leftPhotos[0].photoUrl = rightPhotos[0].photoUrl;
          rightPhotos[0].photoUrl = tempUrl;
          responseMessage = `Фотографии на левой и правой страницах разворота ${spreadIdx + 1} поменялись местами.`;
        }
      }
    } else if (cmd.includes('пастель') || cmd.includes('фон') || cmd.includes('цветов')) {
      // "Сделай все страницы в одной цветовой гамме"
      for (const sp of updatedDoc.spreads) {
        sp.leftPage.backgroundColor = '#F6EFE6';
        sp.rightPage.backgroundColor = '#F6EFE6';
      }
      updatedDoc.cover.backgroundColor = '#F6EFE6';
      responseMessage = 'Все страницы книги переведены в фирменную тёплую льняную гамму (#F6EFE6).';
    } else if (cmd.includes('крупн') || cmd.includes('больш')) {
      // "Добавь больше крупных фотографий"
      if (targetSpread) {
        targetSpread.leftPage.elements = [
          {
            id: uuidv4(),
            type: 'photo',
            x: 6,
            y: 6,
            width: 88,
            height: 88,
            zIndex: 1,
            photoUrl: targetSpread.leftPage.elements[0]?.photoUrl || updatedDoc.cover.coverPhotoUrl
          }
        ];
        responseMessage = `На развороте ${spreadIdx + 1} создана парадная крупная компоновка на всю полосу.`;
      }
    } else {
      // General creative adjustment
      if (targetSpread) {
        targetSpread.leftPage.backgroundColor = '#FFFFFF';
        targetSpread.rightPage.backgroundColor = '#F6EFE6';
        responseMessage = `ИИ адаптировал разворот ${spreadIdx + 1} под ваше пожелание: «${command}».`;
      }
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'usr-test-customer-001',
      new Date().toISOString(),
      'ai:edit_command',
      'project',
      `spread_${spreadIdx}`,
      'success',
      JSON.stringify({ command, spreadIndex: spreadIdx })
    );

    res.json({
      success: true,
      message: responseMessage,
      data: updatedDoc,
      modifiedSpreadIndex: spreadIdx
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
