async function getGitlabPipelineStageStats(projectId, baseUrl, branchName, token) {
    // Verify token is present
    if (!token) {
        throw new Error('GitLab API token is required');
    }

    // Function to fetch pipeline data
    async function fetchPipelines() {
        const response = await fetch(`${baseUrl}/api/v4/projects/${projectId}/pipelines?ref=${branchName}&per_page=100`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    // Function to fetch jobs for a pipeline
    async function fetchPipelineJobs(pipelineId) {
        const response = await fetch(`${baseUrl}/api/v4/projects/${projectId}/pipelines/${pipelineId}/jobs?ref=${branchName}&per_page=100`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    try {
        // Get pipelines
        const pipelines = await fetchPipelines();
        
        // Check if pipelines is an array
        if (!Array.isArray(pipelines)) {
            throw new Error('Pipelines response is not an array');
        }
        
        const first30Pipelines = pipelines.slice(0, 50);

        // Fetch jobs for all pipelines in parallel
        const allJobs = await Promise.all(
            first30Pipelines.map(pipeline => fetchPipelineJobs(pipeline.id))
        ).then(jobArrays => jobArrays.flat());

        // Aggregate jobs by stage
        const stageMap = new Map();

        allJobs.forEach(job => {
            if (!stageMap.has(job.stage)) {
                stageMap.set(job.stage, {
                    stage: job.stage,
                    status: job.status,
                    started_at: job.started_at,
                    stage_jobs: []
                });
            }

            stageMap.get(job.stage).stage_jobs.push({
                job_name: job.name,
                duration: job.duration,
                status: job.status,
                web_url: job.web_url,
                created_at: job.created_at,
                pipeline_id: job.pipeline.id
            });
        });

        // Convert map to array
        return Array.from(stageMap.values());

    } catch (error) {
        console.error('Error fetching pipeline data:', error);
        throw error;
    }
}

// Make it available globally
window.getGitlabPipelineStageStats = getGitlabPipelineStageStats;
