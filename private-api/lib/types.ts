export type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  admin: boolean;
};

export type AccessConfig = {
  posts: Record<string, string[]>;
};

export type GitHubContentFile = {
  type: 'file';
  name: string;
  path: string;
  sha: string;
  content: string;
};

export type GitHubContentEntry = {
  type: string;
  name: string;
  path: string;
  sha: string;
};
