export function formatDistance(miles: number): string {
  if (miles < 1) return 'Under 1 mile'
  if (miles === 1) return '1 mile away'
  return `${miles.toFixed(1)} miles away`
}

export function formatMatchScore(score: number): string {
  return `${Math.round(score)}%`
}

export function getMatchLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Perfect Match', color: 'text-green-600' }
  if (score >= 75) return { label: 'Great Match', color: 'text-blue-600' }
  if (score >= 60) return { label: 'Good Match', color: 'text-yellow-600' }
  return { label: 'Possible Match', color: 'text-gray-500' }
}

export function getHiringSpeedLabel(score: number): string {
  if (score >= 80) return 'Hires Fast'
  if (score >= 50) return 'Standard Hiring'
  return 'Slower Process'
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}
