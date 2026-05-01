/**
 * Prefetch studio routes and begin loading heavy client chunks so the first navigation
 * from the landing page (or between studio tabs) pays less parse/network latency.
 */
export function warmStudioNavigation(router: { prefetch: (href: string) => void }): void {
  router.prefetch('/build-3d')
  router.prefetch('/edit-home')
  router.prefetch('/visit-home')
  void import('@/components/canvas/VividHomeExperience')
  void import('@/components/build/BuildTab')
}
