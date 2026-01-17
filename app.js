// app.js
App({
  /**
   * Lifecycle: When Mini Program initializes
   */
  onLaunch() {
    console.log('2048 Image Game launched');
  },

  /**
   * Lifecycle: When Mini Program shows (from background)
   */
  onShow() {
    console.log('2048 Image Game shown');
  },

  /**
   * Lifecycle: When Mini Program hides (to background)
   */
  onHide() {
    console.log('2048 Image Game hidden');
  },

  /**
   * Global error handler
   */
  onError(msg) {
    console.error('App Error:', msg);
  }
});

