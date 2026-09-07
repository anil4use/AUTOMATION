import axios from 'axios';

const BASE_URL = 'https://api.github.com';

/** Builds axios instance with GitHub PAT auth headers */
export function githubClient(token: string) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

/** Parses owner/repo from a full name like 'octocat/hello-world' */
export function parseRepo(repoName: string, username: string): { owner: string; repo: string } {
  if (repoName.includes('/')) {
    const [owner, repo] = repoName.split('/');
    return { owner, repo };
  }
  return { owner: username, repo: repoName };
}

/** Safe base64 decode for file content returned by GitHub API */
export function decodeFileContent(encoded: string): string {
  return Buffer.from(encoded.replace(/\n/g, ''), 'base64').toString('utf-8');
}

/** Encodes plain text to base64 for GitHub file create/update */
export function encodeFileContent(content: string): string {
  return Buffer.from(content, 'utf-8').toString('base64');
}
