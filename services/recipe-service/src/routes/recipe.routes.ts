import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as ctrl from '../controllers/recipe.controller';

const router = Router();

// Order matters — specific paths before params
router.get('/recommendations', requireAuth, ctrl.getRecommendations);
router.get('/saved',           requireAuth, ctrl.getSavedRecipes);

router.get('/',                requireAuth, ctrl.listRecipes);
router.get('/:id',             requireAuth, ctrl.getRecipe);

router.post('/save/:id',       requireAuth, ctrl.saveRecipe);
router.delete('/saved/:id',    requireAuth, ctrl.unsaveRecipe);

router.post('/:id/log',        requireAuth, ctrl.logRecipe);

export default router;
