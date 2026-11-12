import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';

export const projectsRouter = Router();

// GET /api/projects — List user projects (or all projects if operator)
projectsRouter.get('/projects', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.query.userId as string || 'usr-test-customer-001';
    const isOperator = req.query.role === 'operator';

    let projects: any[];
    if (isOperator) {
      projects = db.prepare(`
        SELECT p.*, pr.name as product_name, pr.category as product_category, pr.image_url as product_image_url
        FROM projects p
        LEFT JOIN products pr ON p.product_id = pr.id
        ORDER BY p.updated_at DESC
      `).all();
    } else {
      projects = db.prepare(`
        SELECT p.*, pr.name as product_name, pr.category as product_category, pr.image_url as product_image_url
        FROM projects p
        LEFT JOIN products pr ON p.product_id = pr.id
        WHERE p.user_id = ? OR p.guest_token = ?
        ORDER BY p.updated_at DESC
      `).all(userId, userId);
    }

    const formatted = projects.map(p => ({
      id: p.id,
      userId: p.user_id,
      guestToken: p.guest_token,
      productId: p.product_id,
      variantId: p.variant_id,
      productName: p.product_name,
      productCategory: p.product_category,
      productImageUrl: p.product_image_url,
      title: p.title,
      status: p.status,
      document: p.settings_json ? JSON.parse(p.settings_json) : null,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/projects/:id — Get single project by ID
projectsRouter.get('/projects/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const p = db.prepare(`
      SELECT p.*, pr.name as product_name, pr.category as product_category, pr.image_url as product_image_url
      FROM projects p
      LEFT JOIN products pr ON p.product_id = pr.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!p) {
      res.status(404).json({ success: false, error: 'Проект не найден' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: p.id,
        userId: p.user_id,
        guestToken: p.guest_token,
        productId: p.product_id,
        variantId: p.variant_id,
        productName: p.product_name,
        productCategory: p.product_category,
        productImageUrl: p.product_image_url,
        title: p.title,
        status: p.status,
        document: p.settings_json ? JSON.parse(p.settings_json) : null,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects — Create new project
projectsRouter.post('/projects', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      userId = 'usr-test-customer-001',
      guestToken,
      productId,
      variantId,
      title,
      document,
      status = 'draft'
    } = req.body;

    if (!productId) {
      res.status(400).json({ success: false, error: 'Не указан productId' });
      return;
    }

    const id = `proj-${uuidv4().slice(0, 8)}`;
    const nowIso = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO projects (
        id, user_id, guest_token, product_id, variant_id, title, status, settings_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      userId,
      guestToken || null,
      productId,
      variantId || null,
      title || 'Моя фотокнига PicPac',
      status,
      JSON.stringify(document || {}),
      nowIso,
      nowIso
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId,
      nowIso,
      'project:create',
      'project',
      id,
      'success',
      JSON.stringify({ title, productId })
    );

    res.status(201).json({
      success: true,
      data: {
        id,
        userId,
        productId,
        variantId,
        title: title || 'Моя фотокнига PicPac',
        status,
        document,
        createdAt: nowIso,
        updatedAt: nowIso
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/projects/:id — Auto-save / update project document
projectsRouter.put('/projects/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const { title, document, status } = req.body;

    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Проект не найден' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newTitle = title !== undefined ? title : existing.title;
    const newStatus = status !== undefined ? status : existing.status;
    const newDocJson = document !== undefined ? JSON.stringify(document) : existing.settings_json;

    db.prepare(`
      UPDATE projects
      SET title = ?, status = ?, settings_json = ?, updated_at = ?
      WHERE id = ?
    `).run(newTitle, newStatus, newDocJson, nowIso, id);

    res.json({
      success: true,
      data: {
        id,
        title: newTitle,
        status: newStatus,
        updatedAt: nowIso
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/duplicate — Duplicate project
projectsRouter.post('/projects/:id/duplicate', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Исходный проект не найден' });
      return;
    }

    const newId = `proj-${uuidv4().slice(0, 8)}`;
    const nowIso = new Date().toISOString();
    const newTitle = `${existing.title} (Копия)`;

    db.prepare(`
      INSERT INTO projects (
        id, user_id, guest_token, product_id, variant_id, title, status, settings_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      existing.user_id,
      existing.guest_token,
      existing.product_id,
      existing.variant_id,
      newTitle,
      'draft',
      existing.settings_json,
      nowIso,
      nowIso
    );

    res.status(201).json({
      success: true,
      data: {
        id: newId,
        title: newTitle,
        status: 'draft',
        createdAt: nowIso
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/projects/:id — Delete project
projectsRouter.delete('/projects/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Проект не найден' });
      return;
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      existing.user_id,
      new Date().toISOString(),
      'project:delete',
      'project',
      id,
      'success',
      JSON.stringify({ title: existing.title })
    );

    res.json({ success: true, message: 'Проект успешно удален' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/privacy/purge-data — Purge user photos and draft projects (Security & Privacy Law 99-Z)
projectsRouter.post('/privacy/purge-data', (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const uid = userId || 'usr-test-customer-001';
    const db = getDatabase();

    // Delete photos linked to user projects
    db.prepare(`
      DELETE FROM photos WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = ?
      )
    `).run(uid);

    // Delete projects
    const deletedProjects = db.prepare('DELETE FROM projects WHERE user_id = ?').run(uid);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      uid,
      new Date().toISOString(),
      'privacy:purge_user_data',
      'user_data',
      uid,
      'success',
      JSON.stringify({ deletedProjectsCount: deletedProjects.changes })
    );

    res.json({
      success: true,
      message: 'Все загруженные фотографии, черновики макетов и временные данные успешно удалены с сервера.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

