import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const usus = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: './src/content/usus',
    }),
    schema: z.object({
        title: z.string(),
        author: z.string(),
        description: z.string().optional(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        draft: z.boolean().default(false),
        aiGenerated: z.boolean().default(false),
    }),
})

const litterae = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: './src/content/litterae',
    }),
    schema: z.object({
        title: z.string(),
        author: z.string(),
        description: z.string().optional(),
        pubDate: z.coerce.date(),
        draft: z.boolean().default(false),
    }),
})

export const collections = { usus, litterae }
