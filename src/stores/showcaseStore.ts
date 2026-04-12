import { atom } from 'nanostores'

export const showcaseStore = atom<{
  heroIndex: number
  showHero: boolean
  isHovering: boolean
}>({
  heroIndex: 0,
  showHero: true,
  isHovering: false,
})
