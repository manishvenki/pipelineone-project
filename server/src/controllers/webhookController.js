import webhookService from '../services/pipeline/webhookService.js';
import logger from '../utils/logger.js';

export const handleGithubWebhook = async (req, res, next) => {
  try {
    const signatureHeader = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
    const eventType = req.headers['x-github-event'] || 'push';
    const deliveryId = req.headers['x-github-delivery'] || null;
    const rawBody = req.rawBody || JSON.stringify(req.body || {});

    logger.info(`Received GitHub webhook: event=${eventType}, delivery=${deliveryId}`);

    const result = await webhookService.handleGitHubWebhook({
      rawBody,
      signatureHeader,
      eventType,
      deliveryId,
      payload: req.body,
    });

    res.status(200).json(result);
  } catch (err) {
    if (err.message && err.message.includes('Invalid webhook HMAC-SHA256 signature')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }
    logger.error('Webhook processing error:', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message || 'Webhook processing failed',
    });
  }
};

export default {
  handleGithubWebhook,
};

