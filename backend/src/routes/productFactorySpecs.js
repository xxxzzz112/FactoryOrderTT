const express = require('express');
const { getProductFactorySpecs, upsertProductFactorySpec, deleteProductFactorySpec } = require('../controllers/productFactorySpecsController');

const router = express.Router();

router.get('/', getProductFactorySpecs);
router.post('/', upsertProductFactorySpec);
router.delete('/:id', deleteProductFactorySpec);

module.exports = router;
