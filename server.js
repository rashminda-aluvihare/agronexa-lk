// Entrypoint wrapper to support hosting environments (like Railway)
// that might be hardcoded to execute the root server.js file.
require('./backend/src/server.js');