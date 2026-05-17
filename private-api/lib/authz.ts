import { readAccessConfig } from './github-content';
import type { GitHubUser } from './types';

export function isAdminUser(user: Pick<GitHubUser, 'login'> | null | undefined) {
  const admins = splitCsv(process.env.ADMIN_GITHUB_USERS).map((login) =>
    login.toLowerCase(),
  );

  return Boolean(user?.login && admins.includes(user.login.toLowerCase()));
}

export async function canReadPost(user: GitHubUser | null, slug: string) {
  if (!user?.login) {
    return false;
  }

  if (isAdminUser(user)) {
    return true;
  }

  const { config } = await readAccessConfig();
  const allowedUsers = config.posts?.[slug] ?? [];
  return allowedUsers
    .map((login) => login.toLowerCase())
    .includes(user.login.toLowerCase());
}

export function splitCsv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
