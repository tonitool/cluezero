import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentOrchestrator } from '@/lib/agents/agent-orchestrator'
import { SEOOptimizer } from '@/lib/agents/seo-optimizer'
import { WordPressClient } from '@/lib/agents/wordpress-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { agentId, taskType, inputData, workspaceId } = body

    if (!agentId || !taskType || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const orchestrator = new AgentOrchestrator(supabase)

    const task = await orchestrator.spawnTask({
      agentId,
      workspaceId,
      taskType,
      inputData: inputData || {},
    })

    const { data: agentData } = await supabase
      .from('agents')
      .select('*, agent_types(*)')
      .eq('id', agentId)
      .maybeSingle()

    if (!agentData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    let result: unknown

    if (agentData.agent_types.slug === 'seo-optimizer') {
      const seoOptimizer = new SEOOptimizer()
      const auditResult = await seoOptimizer.auditWebsite(inputData.target_url, {
        checkMobile: inputData.check_mobile,
        checkSpeed: inputData.check_speed,
        crawlDepth: inputData.crawl_depth,
      })

      await supabase.from('seo_audits').insert({
        workspace_id: workspaceId,
        task_id: task.id,
        target_url: inputData.target_url,
        score: auditResult.score,
        issues: auditResult.issues,
        recommendations: auditResult.recommendations,
        metadata: auditResult.metadata,
      })

      result = auditResult
    } else if (agentData.agent_types.slug === 'ai-search-optimizer') {
      const seoOptimizer = new SEOOptimizer()
      result = await seoOptimizer.optimizeForAISearch(
        inputData.target_url,
        inputData.target_queries || []
      )
    } else if (agentData.agent_types.slug === 'wordpress-seo') {
      const { data: integration } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', inputData.integration_id)
        .eq('workspace_id', workspaceId)
        .maybeSingle()

      if (!integration) {
        throw new Error('WordPress integration not found')
      }

      const wpClient = new WordPressClient({
        url: integration.config.url as string,
        username: integration.config.username as string,
        password: integration.config.password as string,
      })

      if (inputData.action === 'optimize_post') {
        result = await wpClient.optimizePostSEO(inputData.post_id, {
          targetKeywords: inputData.target_keywords,
          metaDescription: inputData.meta_description,
          focusKeyphrase: inputData.focus_keyphrase,
        })
      } else if (inputData.action === 'bulk_optimize') {
        result = await wpClient.bulkOptimizePosts(inputData.post_ids, {
          metaDescription: inputData.meta_description_generator,
          focusKeyphrase: inputData.keyphrase_generator,
        })
      } else {
        throw new Error('Invalid WordPress action')
      }
    } else {
      throw new Error(`Unsupported agent type: ${agentData.agent_types.slug}`)
    }

    await supabase
      .from('agent_tasks')
      .update({
        status: 'completed',
        output_data: result as Record<string, unknown>,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    return NextResponse.json({ task, result })
  } catch (error) {
    console.error('Error executing agent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute agent' },
      { status: 500 }
    )
  }
}
