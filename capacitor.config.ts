import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.employteens.app',
  appName: 'EmployTeens',
  // Offline fallback shell; the real app is served remotely (below) so every
  // web deploy reaches installed apps instantly with no App Store review.
  webDir: 'capacitor-shell',
  server: {
    url: 'https://employteensfinal.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#FAFAFA',
  },
}

export default config
