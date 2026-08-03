import { IConfig } from './configs.interface'

export const generateDefaultConfig: () => IConfig = () => ({
  seo: {
    title: '',
    keywords: [],
    description: '',
  },
  url: {
    serverUrl: 'http://127.0.0.1:2666',
    webUrl: 'http://127.0.0.1:3030',
    wsUrl: 'http://127.0.0.1:2666',
  },
  adminExtra: {
    backgroundUrl: '',
  },
})
