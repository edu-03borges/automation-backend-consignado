const express = require('express');
const router = express.Router();
const campaignsController = require('../main/controllers/CampaignsController');

router.post('/api/create_campaign', campaignsController.createCampaign);

module.exports = router;
