import { Router } from 'express';
import { demoStore, isDemoMode } from '../db/demo-store.js';

const router = Router();

// Get all equipment
router.get('/', async (req, res) => {
  try {
    const { category, level } = req.query;

    let allEquipment;
    if (isDemoMode) {
      allEquipment = demoStore.getEquipment();
    } else {
      const { db, equipment } = await import('../db/index.js');
      allEquipment = await db.query.equipment.findMany();
    }

    // Filter by category
    if (category && category !== 'all') {
      allEquipment = allEquipment.filter((e) => e.category === category);
    }

    // Filter by level
    if (level && level !== 'all') {
      allEquipment = allEquipment.filter(
        (e) => e.level === level || e.level === 'all'
      );
    }

    res.json(allEquipment);
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

// Get equipment by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;

    let categoryEquipment;
    if (isDemoMode) {
      categoryEquipment = demoStore.getEquipment().filter(e => e.category === category);
    } else {
      const { db, equipment } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');
      categoryEquipment = await db.query.equipment.findMany({
        where: eq(equipment.category, category as any),
      });
    }

    res.json(categoryEquipment);
  } catch (error) {
    console.error('Get equipment by category error:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

// Get single equipment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let item;
    if (isDemoMode) {
      item = demoStore.getEquipment().find(e => e.id === parseInt(id));
    } else {
      const { db, equipment } = await import('../db/index.js');
      const { eq } = await import('drizzle-orm');
      item = await db.query.equipment.findFirst({
        where: eq(equipment.id, parseInt(id)),
      });
    }

    if (!item) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

// Get equipment categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'bow', name: '弓（ライザー）', nameEn: 'Bow (Riser)' },
      { id: 'arrow', name: '矢', nameEn: 'Arrows' },
      { id: 'sight', name: 'サイト', nameEn: 'Sight' },
      { id: 'stabilizer', name: 'スタビライザー', nameEn: 'Stabilizer' },
      { id: 'rest', name: 'レスト', nameEn: 'Rest' },
      { id: 'tab', name: 'タブ', nameEn: 'Tab' },
      { id: 'other', name: 'その他', nameEn: 'Other' },
    ];

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;
