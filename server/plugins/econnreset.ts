// Ignore ECONNRESET errors (client disconnecting mid-request)
// These are benign and should not trigger a Nuxt dev server restart
export default defineNitroPlugin(() => {
  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason as { code?: string }
    if (err?.code === 'ECONNRESET') return
    // Re-throw other unhandled rejections
    throw reason
  })
})
