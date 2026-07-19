/**
 * Detox end-to-end configuration — STUB for the pre-pilot device-testing
 * round (proposal Section 10: emulator plus at least two physical Android
 * devices). Not wired into CI yet; see e2e/README.md for the planned suite,
 * including the on-device database-encryption verification.
 *
 * To activate: npm i -D detox jest @config-plugins/detox, add the config
 * plugin, build a debug APK, then `detox test`.
 */
module.exports = {
  testRunner: {
    args: { $0: 'jest', config: 'e2e/jest.config.js' },
  },
  apps: {
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_5_API_34' },
    },
  },
  configurations: {
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};
