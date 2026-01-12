/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .slice(0, 50); // Limit length
}

/**
 * Create a branch name from issue number and title
 */
export function createBranchName(issueNumber: number, title: string): string {
  const slug = slugify(title);
  return `issue-${issueNumber}-${slug}`;
}

/**
 * Extract issue number from a branch name like "issue-42-some-feature"
 */
export function extractIssueNumber(branchName: string): number | null {
  const match = branchName.match(/^issue-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
