export const cacheStrategies = {
  contacts: {
    persist: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
    maxItems: 1000,
    fields: ['id', 'name', 'phone', 'email'] as const,
  },

  automations: {
    persist: true,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dias
    maxItems: 100,
    fields: 'all' as const,
  },

  conversations: {
    persist: true,
    maxAge: 1000 * 60 * 60 * 24 * 3, // 3 dias
    maxItems: 500,
    fields: ['id', 'contact_id', 'last_message', 'updated_at'] as const,
  },

  analytics: {
    persist: false,
    maxAge: 1000 * 60 * 5,
    fields: 'all' as const,
  },

  media: {
    persist: false,
    maxAge: 1000 * 60 * 30,
    fields: 'all' as const,
  },
};

export type CacheDomain = keyof typeof cacheStrategies;
