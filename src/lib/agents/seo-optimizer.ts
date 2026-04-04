import { parse } from 'node-html-parser'
import axios from 'axios'

export interface SEOAuditResult {
  score: number
  issues: SEOIssue[]
  recommendations: SEORecommendation[]
  metadata: {
    url: string
    title: string | null
    description: string | null
    wordCount: number
    headingStructure: Record<string, number>
    hasH1: boolean
    imageCount: number
    imagesWithoutAlt: number
    internalLinks: number
    externalLinks: number
    loadTime: number
    hasRobots: boolean
    hasCanonical: boolean
    hasOpenGraph: boolean
    hasStructuredData: boolean
  }
}

export interface SEOIssue {
  severity: 'critical' | 'warning' | 'info'
  category: string
  message: string
  element?: string
}

export interface SEORecommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  action: string
  impact: string
}

export class SEOOptimizer {
  async auditWebsite(url: string, options: {
    checkMobile?: boolean
    checkSpeed?: boolean
    crawlDepth?: number
  } = {}): Promise<SEOAuditResult> {
    const startTime = Date.now()

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Agent/1.0; +https://seo-agent.com)',
        },
        timeout: 10000,
      })

      const html = response.data
      const root = parse(html)
      const loadTime = Date.now() - startTime

      const issues: SEOIssue[] = []
      const recommendations: SEORecommendation[] = []

      const title = root.querySelector('title')?.text || null
      const description = root.querySelector('meta[name="description"]')?.getAttribute('content') || null

      const bodyText = root.querySelector('body')?.text || ''
      const wordCount = bodyText.trim().split(/\s+/).length

      const h1Tags = root.querySelectorAll('h1')
      const h2Tags = root.querySelectorAll('h2')
      const h3Tags = root.querySelectorAll('h3')
      const h4Tags = root.querySelectorAll('h4')
      const h5Tags = root.querySelectorAll('h5')
      const h6Tags = root.querySelectorAll('h6')

      const headingStructure = {
        h1: h1Tags.length,
        h2: h2Tags.length,
        h3: h3Tags.length,
        h4: h4Tags.length,
        h5: h5Tags.length,
        h6: h6Tags.length,
      }

      const images = root.querySelectorAll('img')
      const imagesWithoutAlt = images.filter(img => !img.getAttribute('alt')).length

      const internalLinks = root.querySelectorAll(`a[href^="/"], a[href^="${url}"]`).length
      const externalLinks = root.querySelectorAll('a[href^="http"]').length - internalLinks

      const hasRobots = !!root.querySelector('meta[name="robots"]')
      const hasCanonical = !!root.querySelector('link[rel="canonical"]')
      const hasOpenGraph = !!root.querySelector('meta[property^="og:"]')
      const hasStructuredData = html.includes('application/ld+json')

      if (!title) {
        issues.push({
          severity: 'critical',
          category: 'Meta Tags',
          message: 'Missing title tag',
        })
        recommendations.push({
          priority: 'high',
          category: 'Meta Tags',
          action: 'Add a descriptive title tag (50-60 characters)',
          impact: 'Titles are critical for SEO and click-through rates',
        })
      } else if (title.length < 30 || title.length > 60) {
        issues.push({
          severity: 'warning',
          category: 'Meta Tags',
          message: `Title length is ${title.length} characters (optimal: 50-60)`,
          element: title,
        })
        recommendations.push({
          priority: 'high',
          category: 'Meta Tags',
          action: 'Adjust title length to 50-60 characters',
          impact: 'Proper title length ensures full display in search results',
        })
      }

      if (!description) {
        issues.push({
          severity: 'critical',
          category: 'Meta Tags',
          message: 'Missing meta description',
        })
        recommendations.push({
          priority: 'high',
          category: 'Meta Tags',
          action: 'Add a compelling meta description (150-160 characters)',
          impact: 'Meta descriptions improve click-through rates from search results',
        })
      } else if (description.length < 120 || description.length > 160) {
        issues.push({
          severity: 'warning',
          category: 'Meta Tags',
          message: `Meta description length is ${description.length} characters (optimal: 150-160)`,
        })
      }

      if (h1Tags.length === 0) {
        issues.push({
          severity: 'critical',
          category: 'Content Structure',
          message: 'No H1 heading found',
        })
        recommendations.push({
          priority: 'high',
          category: 'Content Structure',
          action: 'Add exactly one H1 heading that describes the page content',
          impact: 'H1 tags help search engines understand page hierarchy',
        })
      } else if (h1Tags.length > 1) {
        issues.push({
          severity: 'warning',
          category: 'Content Structure',
          message: `Multiple H1 headings found (${h1Tags.length})`,
        })
        recommendations.push({
          priority: 'medium',
          category: 'Content Structure',
          action: 'Use only one H1 heading per page',
          impact: 'Multiple H1s can confuse search engines',
        })
      }

      if (wordCount < 300) {
        issues.push({
          severity: 'warning',
          category: 'Content',
          message: `Low word count (${wordCount} words)`,
        })
        recommendations.push({
          priority: 'medium',
          category: 'Content',
          action: 'Expand content to at least 300 words for better context',
          impact: 'Longer, quality content tends to rank better',
        })
      }

      if (imagesWithoutAlt > 0) {
        issues.push({
          severity: 'warning',
          category: 'Accessibility',
          message: `${imagesWithoutAlt} images without alt text`,
        })
        recommendations.push({
          priority: 'medium',
          category: 'Accessibility',
          action: 'Add descriptive alt text to all images',
          impact: 'Alt text improves accessibility and image SEO',
        })
      }

      if (!hasCanonical) {
        issues.push({
          severity: 'info',
          category: 'Technical SEO',
          message: 'No canonical URL specified',
        })
        recommendations.push({
          priority: 'low',
          category: 'Technical SEO',
          action: 'Add a canonical link tag to prevent duplicate content issues',
          impact: 'Canonicals help manage duplicate content',
        })
      }

      if (!hasOpenGraph) {
        issues.push({
          severity: 'info',
          category: 'Social Media',
          message: 'No Open Graph tags found',
        })
        recommendations.push({
          priority: 'low',
          category: 'Social Media',
          action: 'Add Open Graph tags for better social media sharing',
          impact: 'Improves appearance when shared on social platforms',
        })
      }

      if (!hasStructuredData) {
        issues.push({
          severity: 'info',
          category: 'Structured Data',
          message: 'No structured data (JSON-LD) detected',
        })
        recommendations.push({
          priority: 'medium',
          category: 'Structured Data',
          action: 'Add Schema.org structured data for rich snippets',
          impact: 'Structured data enables rich search results',
        })
      }

      if (loadTime > 3000) {
        issues.push({
          severity: 'warning',
          category: 'Performance',
          message: `Slow load time (${loadTime}ms)`,
        })
        recommendations.push({
          priority: 'high',
          category: 'Performance',
          action: 'Optimize page load time to under 3 seconds',
          impact: 'Page speed is a ranking factor and affects user experience',
        })
      }

      const score = this.calculateScore(issues)

      return {
        score,
        issues,
        recommendations,
        metadata: {
          url,
          title,
          description,
          wordCount,
          headingStructure,
          hasH1: h1Tags.length === 1,
          imageCount: images.length,
          imagesWithoutAlt,
          internalLinks,
          externalLinks,
          loadTime,
          hasRobots,
          hasCanonical,
          hasOpenGraph,
          hasStructuredData,
        },
      }
    } catch (error) {
      throw new Error(`Failed to audit website: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private calculateScore(issues: SEOIssue[]): number {
    let score = 100

    for (const issue of issues) {
      if (issue.severity === 'critical') {
        score -= 15
      } else if (issue.severity === 'warning') {
        score -= 5
      } else if (issue.severity === 'info') {
        score -= 2
      }
    }

    return Math.max(0, score)
  }

  async optimizeForAISearch(url: string, targetQueries: string[]): Promise<{
    suggestions: string[]
    structuredDataRecommendations: Record<string, unknown>[]
    contentOptimizations: string[]
  }> {
    const suggestions: string[] = []
    const structuredDataRecommendations: Record<string, unknown>[] = []
    const contentOptimizations: string[] = []

    suggestions.push('Use clear, concise headings that directly answer common questions')
    suggestions.push('Structure content with bullet points and numbered lists for easy extraction')
    suggestions.push('Include a FAQ section with common questions and direct answers')
    suggestions.push('Add summary paragraphs at the beginning of long content')
    suggestions.push('Use semantic HTML elements (article, section, aside) for better structure')

    structuredDataRecommendations.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: targetQueries.map(query => ({
        '@type': 'Question',
        name: query,
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your answer here',
        },
      })),
    })

    contentOptimizations.push('Add clear definitions and explanations for technical terms')
    contentOptimizations.push('Include relevant statistics and data points with sources')
    contentOptimizations.push('Use natural language that matches how people ask questions')
    contentOptimizations.push('Create comprehensive, authoritative content that AI can cite')

    return {
      suggestions,
      structuredDataRecommendations,
      contentOptimizations,
    }
  }
}
