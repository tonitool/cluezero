import axios, { AxiosInstance } from 'axios'

export interface WordPressPost {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  excerpt: { rendered: string }
  slug: string
  status: string
  link: string
  meta: Record<string, unknown>
}

export interface WordPressConfig {
  url: string
  username: string
  password: string
}

export class WordPressClient {
  private api: AxiosInstance
  private baseUrl: string

  constructor(config: WordPressConfig) {
    this.baseUrl = config.url.replace(/\/$/, '')

    this.api = axios.create({
      baseURL: `${this.baseUrl}/wp-json/wp/v2`,
      auth: {
        username: config.username,
        password: config.password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.api.get('/posts', { params: { per_page: 1 } })
      return true
    } catch (error) {
      throw new Error(`WordPress connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPosts(params: {
    page?: number
    perPage?: number
    search?: string
    status?: string
  } = {}): Promise<WordPressPost[]> {
    const { data } = await this.api.get('/posts', {
      params: {
        page: params.page || 1,
        per_page: params.perPage || 10,
        search: params.search,
        status: params.status || 'publish',
      },
    })
    return data
  }

  async getPost(postId: number): Promise<WordPressPost> {
    const { data } = await this.api.get(`/posts/${postId}`)
    return data
  }

  async updatePost(postId: number, updates: {
    title?: string
    content?: string
    excerpt?: string
    meta?: Record<string, unknown>
  }): Promise<WordPressPost> {
    const payload: Record<string, unknown> = {}

    if (updates.title) {
      payload.title = updates.title
    }
    if (updates.content) {
      payload.content = updates.content
    }
    if (updates.excerpt) {
      payload.excerpt = updates.excerpt
    }
    if (updates.meta) {
      payload.meta = updates.meta
    }

    const { data } = await this.api.post(`/posts/${postId}`, payload)
    return data
  }

  async optimizePostSEO(postId: number, options: {
    targetKeywords?: string[]
    metaDescription?: string
    focusKeyphrase?: string
  }): Promise<{
    updated: boolean
    changes: string[]
  }> {
    const post = await this.getPost(postId)
    const changes: string[] = []

    const updates: Record<string, unknown> = {
      meta: {},
    }

    if (options.metaDescription) {
      updates.meta = {
        ...updates.meta,
        _yoast_wpseo_metadesc: options.metaDescription,
      }
      changes.push('Updated meta description')
    }

    if (options.focusKeyphrase) {
      updates.meta = {
        ...updates.meta,
        _yoast_wpseo_focuskw: options.focusKeyphrase,
      }
      changes.push('Set focus keyphrase')
    }

    if (Object.keys(updates.meta as object).length > 0) {
      await this.updatePost(postId, updates)
      return { updated: true, changes }
    }

    return { updated: false, changes: [] }
  }

  async bulkOptimizePosts(postIds: number[], optimizations: {
    metaDescription?: (post: WordPressPost) => string
    focusKeyphrase?: (post: WordPressPost) => string
  }): Promise<{
    successful: number
    failed: number
    errors: string[]
  }> {
    let successful = 0
    let failed = 0
    const errors: string[] = []

    for (const postId of postIds) {
      try {
        const post = await this.getPost(postId)
        const updates: Record<string, unknown> = { meta: {} }

        if (optimizations.metaDescription) {
          const metaDesc = optimizations.metaDescription(post)
          updates.meta = {
            ...updates.meta,
            _yoast_wpseo_metadesc: metaDesc,
          }
        }

        if (optimizations.focusKeyphrase) {
          const keyphrase = optimizations.focusKeyphrase(post)
          updates.meta = {
            ...updates.meta,
            _yoast_wpseo_focuskw: keyphrase,
          }
        }

        if (Object.keys(updates.meta as object).length > 0) {
          await this.updatePost(postId, updates)
        }

        successful++
      } catch (error) {
        failed++
        errors.push(`Post ${postId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { successful, failed, errors }
  }

  async getPages(params: {
    page?: number
    perPage?: number
  } = {}): Promise<WordPressPost[]> {
    const { data } = await this.api.get('/pages', {
      params: {
        page: params.page || 1,
        per_page: params.perPage || 10,
      },
    })
    return data
  }

  async getSiteInfo(): Promise<{
    name: string
    description: string
    url: string
    home: string
  }> {
    const { data } = await axios.get(`${this.baseUrl}/wp-json`)
    return {
      name: data.name,
      description: data.description,
      url: data.url,
      home: data.home,
    }
  }
}
