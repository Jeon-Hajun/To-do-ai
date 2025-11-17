const { Octokit } = require('@octokit/rest');

/**
 * GitHub 저장소에서 정보를 가져오는 서비스
 */
class GitHubService {
  constructor(token = null) {
    // 토큰이 제공되면 사용, 없으면 토큰 없이 사용
    if (token && token.trim() !== '') {
      // 토큰이 있지만 잘못된 형식일 수 있으므로 검증
      const trimmedToken = token.trim();
      if (!trimmedToken.startsWith('ghp_') && !trimmedToken.startsWith('github_pat_')) {
        console.warn('[GitHubService] 토큰 형식이 예상과 다릅니다:', trimmedToken.substring(0, 10) + '...');
      }
    this.octokit = new Octokit({
        auth: trimmedToken
    });
      console.log('[GitHubService] 토큰으로 인증된 API 클라이언트 생성됨');
    } else {
      // 토큰 없이 공개 저장소만 조회 (Rate Limit: IP당 60회/시간)
      this.octokit = new Octokit();
      console.log('[GitHubService] 토큰 없이 공개 저장소만 조회 가능');
    }
  }

  /**
   * GitHub 저장소 URL에서 owner와 repo 추출
   * 예: https://github.com/owner/repo -> { owner: 'owner', repo: 'repo' }
   */
  parseRepoUrl(repoUrl) {
    if (!repoUrl) {
      throw new Error('GitHub 저장소 URL이 필요합니다.');
    }

    // URL 정리 (앞뒤 공백 제거)
    const trimmedUrl = repoUrl.trim();
    
    // 다양한 GitHub URL 형식 지원
    // https://github.com/owner/repo
    // http://github.com/owner/repo
    // github.com/owner/repo
    // git@github.com:owner/repo.git
    const patterns = [
      /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/,  // 기본 형식
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,  // http/https 명시
      /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,  // SSH 형식
    ];

    let match = null;
    for (const pattern of patterns) {
      match = trimmedUrl.match(pattern);
      if (match) break;
    }

    if (!match) {
      console.error('[parseRepoUrl] URL 파싱 실패:', trimmedUrl);
      throw new Error(`유효하지 않은 GitHub 저장소 URL입니다: ${trimmedUrl}`);
    }

    const owner = match[1];
    const repo = match[2].replace('.git', '');

    console.log(`[parseRepoUrl] 파싱 결과: owner=${owner}, repo=${repo}`);

    return {
      owner,
      repo
    };
  }

  /**
   * 커밋 목록 가져오기 (페이지네이션 지원)
   */
  async getCommits(repoUrl, options = {}) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const { perPage = 100, since, maxCommits = null } = options;

      const params = {
        owner,
        repo,
        per_page: Math.min(perPage, 100) // GitHub API 최대값은 100
      };

      if (since) {
        params.since = since;
      }

      console.log(`[getCommits] API 호출: ${owner}/${repo}, perPage: ${params.per_page}, maxCommits: ${maxCommits || '무제한'}`);
      
      // maxCommits가 지정되지 않았거나 null이면 모든 커밋 가져오기 (페이지네이션)
      if (maxCommits === null) {
        const allCommits = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await this.octokit.repos.listCommits({
            ...params,
            page: page
          });

          const commits = response.data.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            url: commit.html_url,
            stats: null // stats는 별도 API 호출 필요
          }));

          allCommits.push(...commits);
          console.log(`[getCommits] 페이지 ${page}: ${commits.length}개 커밋 (누적: ${allCommits.length}개)`);

          // 마지막 페이지인지 확인 (응답이 per_page보다 적으면 마지막 페이지)
          if (commits.length < params.per_page) {
            hasMore = false;
          } else {
            page++;
          }
        }

        console.log(`[getCommits] 전체 응답 성공: 총 ${allCommits.length}개 커밋`);
        return allCommits;
      } else {
        // maxCommits가 지정된 경우 해당 개수만큼만 가져오기
        const commits = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && commits.length < maxCommits) {
          const remaining = maxCommits - commits.length;
          const currentPerPage = Math.min(params.per_page, remaining);

          const response = await this.octokit.repos.listCommits({
            ...params,
            per_page: currentPerPage,
            page: page
          });

          const pageCommits = response.data.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            url: commit.html_url,
            stats: null
          }));

          commits.push(...pageCommits);
          console.log(`[getCommits] 페이지 ${page}: ${pageCommits.length}개 커밋 (누적: ${commits.length}개)`);

          if (pageCommits.length < currentPerPage || commits.length >= maxCommits) {
            hasMore = false;
          } else {
            page++;
          }
        }

        console.log(`[getCommits] 응답 성공: 총 ${commits.length}개 커밋`);
        return commits.slice(0, maxCommits);
      }
    } catch (error) {
      console.error('[getCommits] 커밋 조회 오류:', error);
      console.error('[getCommits] 에러 상세:', {
        status: error.status,
        message: error.message,
        response: error.response?.data
      });
      
      // Bad credentials 에러인 경우 더 명확한 메시지 제공
      if (error.status === 401 || error.message.includes('Bad credentials')) {
        throw new Error(`인증 실패: GitHub 토큰이 잘못되었거나 만료되었습니다. 토큰을 확인하고 다시 시도해주세요.`);
      }
      
      // Not Found 에러인 경우 더 명확한 메시지 제공
      if (error.status === 404 || error.message.includes('Not Found')) {
        let ownerRepo = '알 수 없음';
        try {
          const parsed = this.parseRepoUrl(repoUrl);
          ownerRepo = `${parsed.owner}/${parsed.repo}`;
        } catch (parseError) {
          ownerRepo = repoUrl;
        }
        throw new Error(`저장소를 찾을 수 없습니다: ${ownerRepo}. 저장소 URL이 올바른지, Private 저장소인 경우 토큰에 'repo' 권한이 있는지 확인해주세요.`);
      }
      
      throw new Error(`커밋 조회 실패: ${error.message}`);
    }
  }

  /**
   * 커밋 상세 정보 (통계 포함) 가져오기
   */
  async getCommitStats(repoUrl, sha) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      
      console.log(`[getCommitStats] 요청: ${owner}/${repo}, SHA: ${sha.substring(0, 7)}`);
      
      const response = await this.octokit.repos.getCommit({
        owner,
        repo,
        ref: sha
      });

      // 응답 데이터 구조 확인
      console.log(`[getCommitStats] 응답 확인:`, {
        hasStats: !!response.data.stats,
        hasFiles: !!response.data.files,
        stats: response.data.stats,
        filesLength: response.data.files?.length
      });

      // stats가 없을 수도 있으므로 확인
      const stats = response.data.stats || { additions: 0, deletions: 0, total: 0 };
      const files = response.data.files || [];

      // 디버깅: stats 정보 확인
      if (!response.data.stats) {
        console.warn(`[getCommitStats] 커밋 ${sha.substring(0, 7)}의 stats가 없습니다.`);
      }

      const result = {
        sha: response.data.sha,
        message: response.data.commit.message,
        author: response.data.commit.author.name,
        date: response.data.commit.author.date,
        linesAdded: stats.additions || 0,
        linesDeleted: stats.deletions || 0,
        filesChanged: files.length || 0,
        files: files.map(file => ({
          filename: file.filename,
          status: file.status, // 'added', 'modified', 'removed', 'renamed'
          additions: file.additions || 0,
          deletions: file.deletions || 0,
          changes: file.changes || 0,
          patch: file.patch || null // 실제 코드 변경 내용 (diff)
        }))
      };

      console.log(`[getCommitStats] 반환값:`, {
        ...result,
        files: result.files.map(f => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions }))
      });

      return result;
    } catch (error) {
      console.error(`[getCommitStats] 커밋 ${sha.substring(0, 7)} 상세 조회 오류:`, error.message);
      console.error(`[getCommitStats] 에러 상세:`, error);
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
          labels: issue.labels.map(l => l.name),
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

      // 저장소 정보 가져오기 (기본 브랜치 확인용)
      const repoInfo = await this.octokit.repos.get({
        owner,
        repo
      });
      const defaultBranch = repoInfo.data.default_branch;

      // 브랜치 목록 가져오기
      const response = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });

      return response.data.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected,
        isDefault: branch.name === defaultBranch
      }));
    } catch (error) {
      console.error('브랜치 조회 오류:', error);
      throw new Error(`브랜치 조회 실패: ${error.message}`);
    }
  }

  /**
   * 파일 내용 가져오기
   * @param {string} repoUrl - GitHub 저장소 URL
   * @param {string} filePath - 파일 경로 (예: 'src/index.js')
   * @param {string} ref - 브랜치/태그/SHA (기본값: 'main')
   * @param {number} maxLines - 최대 라인 수 (기본값: 500, 0이면 전체)
   * @returns {Promise<Object>} { content: string, size: number, encoding: string, truncated: boolean }
   */
  async getFileContent(repoUrl, filePath, ref = 'main', maxLines = 500) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      
      console.log(`[getFileContent] 요청: ${owner}/${repo}, 파일: ${filePath}, 브랜치: ${ref}`);
      
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: ref
      });

      if (Array.isArray(response.data)) {
        throw new Error('디렉토리입니다. 파일 경로를 지정해주세요.');
      }

      if (response.data.type !== 'file') {
        throw new Error('파일이 아닙니다.');
      }

      let content = '';
      let truncated = false;
      
      if (response.data.encoding === 'base64') {
        const Buffer = require('buffer').Buffer;
        content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      } else {
        content = response.data.content || '';
      }

      // 라인 수 제한
      if (maxLines > 0) {
        const lines = content.split('\n');
        if (lines.length > maxLines) {
          content = lines.slice(0, maxLines).join('\n');
          truncated = true;
        }
      }

      return {
        content: content,
        size: response.data.size,
        encoding: response.data.encoding,
        sha: response.data.sha,
        path: response.data.path,
        truncated: truncated,
        totalLines: content.split('\n').length
      };
    } catch (error) {
      console.error(`[getFileContent] 파일 읽기 오류: ${error.message}`);
      if (error.status === 404) {
        throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
      }
      throw new Error(`파일 읽기 실패: ${error.message}`);
    }
  }

  /**
   * 여러 파일 내용을 일괄 가져오기
   * @param {string} repoUrl - GitHub 저장소 URL
   * @param {Array<string>} filePaths - 파일 경로 배열
   * @param {string} ref - 브랜치/태그/SHA
   * @param {number} maxLinesPerFile - 파일당 최대 라인 수
   * @returns {Promise<Array<Object>>} 파일 내용 배열
   */
  async getMultipleFileContents(repoUrl, filePaths, ref = 'main', maxLinesPerFile = 500) {
    try {
      const results = await Promise.allSettled(
        filePaths.map(filePath => 
          this.getFileContent(repoUrl, filePath, ref, maxLinesPerFile)
            .then(content => ({ ...content, filePath }))
            .catch(error => ({ 
              filePath, 
              error: error.message,
              content: null 
            }))
        )
      );

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            filePath: filePaths[index],
            error: result.reason?.message || '알 수 없는 오류',
            content: null
          };
        }
      });
    } catch (error) {
      console.error('[getMultipleFileContents] 일괄 파일 읽기 오류:', error);
      throw new Error(`일괄 파일 읽기 실패: ${error.message}`);
    }
  }
}

module.exports = GitHubService;

