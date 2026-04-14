/**
 * Sentry Error Tracking Integration
 * Monitors all errors in real-time
 * Provides alerts for critical issues
 */

const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

class SentryConfig {
  static initialize() {
    if (!process.env.SENTRY_DSN) {
      logger.warn('Sentry not configured (SENTRY_DSN not set)');
      return false;
    }

    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({
            request: true,
            serverName: false,
          }),
        ],
        beforeSend(event, hint) {
          // Filter out certain errors
          if (event.exception) {
            const error = hint.originalException;
            
            // Don't send 404 errors
            if (error && error.statusCode === 404) {
              return null;
            }

            // Don't send rate limit errors (expected)
            if (error && error.statusCode === 429) {
              return null;
            }
          }

          return event;
        },
        attachStacktrace: true,
      });

      logger.success('Sentry initialized');
      return true;
    } catch (error) {
      logger.error('Sentry initialization failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get request/tracing handler
   */
  static requestHandler() {
    return Sentry.Handlers.requestHandler();
  }

  /**
   * Get error handler
   */
  static errorHandler() {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Only handle errors with statusCode >= 500
        if (error.statusCode && error.statusCode < 500) {
          return false;
        }
        return true;
      },
    });
  }

  /**
   * Capture exception
   */
  static captureException(error, context = {}) {
    Sentry.captureException(error, {
      contexts: { custom: context },
    });
  }

  /**
   * Capture message
   */
  static captureMessage(message, level = 'info', context = {}) {
    Sentry.captureMessage(message, {
      level,
      contexts: { custom: context },
    });
  }

  /**
   * Set user context
   */
  static setUser(userId, email = null) {
    Sentry.setUser({
      id: userId,
      email,
    });
  }

  /**
   * Clear user context
   */
  static clearUser() {
    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb
   */
  static addBreadcrumb(message, category = 'info', level = 'info') {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      timestamp: Date.now() / 1000,
    });
  }
}

module.exports = SentryConfig;
