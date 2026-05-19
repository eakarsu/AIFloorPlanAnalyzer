// AR visualisation: phone-camera AR overlay (provider stub).
import express from 'express';

const router = express.Router();

// POST /api/ar-visualisation/scene { floor_plan_id, room_id, materials:{wall_color, floor_texture}, products:[{sku, model_url}] }
router.post('/scene', async (req, res) => {
  try {
    const { floor_plan_id, room_id, materials = {}, products = [] } = req.body || {};
    if (!floor_plan_id || !room_id) return res.status(400).json({ error: 'floor_plan_id + room_id required' });
    // TODO: configure credentials — AR_RENDER_SERVICE_URL or 8thwall/Niantic-Lightship key
    const scene = {
      id: `scene_${Date.now()}`,
      floor_plan_id,
      room_id,
      materials,
      products,
      ar_qr_url: `https://example.com/ar?scene=scene_${Date.now()}`,
      usdz_url: null,
      glb_url: null,
    };
    return res.json({ scene, notice: 'AR_RENDER_SERVICE_URL not wired — returning metadata only' });
  } catch (e) {
    return res.status(500).json({ error: 'scene failed' });
  }
});

export default router;
