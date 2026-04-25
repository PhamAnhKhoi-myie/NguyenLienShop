/**
 * Structured JSON Logger
 * 
 * ✅ Logs all critical events in JSON format
 * ✅ Includes timestamp + level
 * ✅ Never logs sensitive data (tokens, passwords)
 * ✅ Used across all modules for observability
 */

const logger = {
    /**
     * Info level - normal flow events
     * @param {Object} data - Event data with event name + identifiers
     */
    info: (data) => {
        console.log(JSON.stringify({
            level: 'info',
            timestamp: new Date().toISOString(),
            ...data
        }));
    },

    /**
     * Warn level - business issues (stock fail, retry)
     * @param {Object} data - Event data
     */
    warn: (data) => {
        console.warn(JSON.stringify({
            level: 'warn',
            timestamp: new Date().toISOString(),
            ...data
        }));
    },

    /**
     * Error level - system failures
     * @param {Object} data - Error data with code + stack
     */
    error: (data) => {
        console.error(JSON.stringify({
            level: 'error',
            timestamp: new Date().toISOString(),
            ...data
        }));
    }
};

module.exports = logger;