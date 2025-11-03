const { Octokit } = require('@octokit/rest');

/**
 * GitHub 저장소에서 정보를 가져오는 서비스
 */
class GitHubService {
  constructor(token = null) {
    this.octokit = new Octokit({
      auth: token
    });
  }

  /**
   * GitHub 저장소 URL에서 owner와 repo 추출
   * 예: https://github.com/owner/repo -> { owner: 'owner', repo: 'repo' }
   */
  parseRepoUrl(repoUrl) {
    if (!repoUrl) {
      throw new Error('GitHub 저장소 URL이 필요합니다.');
    }

    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (!match) {
      throw new Error('유효하지 않은 GitHub 저장소 URL입니다.');
    }

    return {
      owner: match[1],
      repo: match[2].replace('.git', '')
    };
  }

  /**
   * 커밋 목록 가져오기
   */
  async getCommits(repoUrl, options = {}) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const { perPage = 30, since } = options;

      const params = {
        owner,
        repo,
        per_page: perPage
      };

      if (since) {
        params.since = since;
      }

      const response = await this.octokit.repos.listCommits(params);
      
      return response.data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        url: commit.html_url,
        stats: null // stats는 별도 API 호출 필요
      }));
    } catch (error) {
      console.error('커밋 조회 오류:', error);
      throw new Error(`커밋 조회 실패: ${error.message}`);
    }
  }

  /**
   * 커밋 상세 정보 (통계 포함) 가져오기
   */
  async getCommitStats(repoUrl, sha) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      
      const response = await this.octokit.repos.getCommit({
        owner,
        repo,
        ref: sha
      });

      const stats = response.data.stats || { additions: 0, deletions: 0, total: 0 };
      const files = response.data.files || [];

      return {
        sha: response.data.sha,
        message: response.data.commit.message,
        author: response.data.commit.author.name,
        date: response.data.commit.author.date,
        linesAdded: stats.additions,
        linesDeleted: stats.deletions,
        filesChanged: files.length
      };
    } catch (error) {
      console.error('커밋 상세 조회 오류:', error);
      throw new Error(`커밋 상세 조회 실패: ${error.message}`);
    }
  }

  /**
   * 이슈 목록 가져오기
   */
  async getIssues(repoUrl, options = {}) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const { state = 'all', perPage = 30 } = options;

      const response = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state,
        per_page: perPage
      });

      return response.data
        .filter(issue => !issue.pull_request) // PR 제외
        .map(issue => ({
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          assignees: issue.assignees.map(a => a.login),
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          closedAt: issue.closed_at
        }));
    } catch (error) {
      console.error('이슈 조회 오류:', error);
      throw new Error(`이슈 조회 실패: ${error.message}`);
    }
  }

  /**
   * 브랜치 목록 가져오기
   */
  async getBranches(repoUrl) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);

      const response = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });

      return response.data.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected
      }));
    } catch (error) {
      console.error('브랜치 조회 오류:', error);
      throw new Error(`브랜치 조회 실패: ${error.message}`);
    }
  }
}

module.exports = GitHubService;

