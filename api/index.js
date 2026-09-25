const { buildApp } = require("../backend/dist/app.js");

let appPromise;
module.exports = async function handler(request, response) {
  // No listener is opened in Vercel. Concurrent cold-start requests share startup.
  appPromise ??= buildApp()
    .then(async (app) => {
      await app.ready();
      return app;
    })
    .catch((error) => {
      appPromise = undefined;
      throw error;
    });
  const app = await appPromise;
  app.server.emit("request", request, response);
};
