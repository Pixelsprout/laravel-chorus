import "../../vendor/ganyicz/bond/js/alpine";
import "virtual:bond";

import chorus from '@pixelsprout/chorus-alpine';

// Register Chorus as an Alpine plugin
window.Alpine.plugin(chorus);

/**
 * Echo exposes an expressive API for subscribing to channels and listening
 * for events that are broadcast by Laravel. Echo and event broadcasting
 * allow your team to quickly build robust real-time web applications.
 */

import './echo';
