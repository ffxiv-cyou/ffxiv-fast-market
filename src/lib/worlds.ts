export const DATA_CENTERS: { name: string; worlds: string[] }[] = [
  {
    name: '陆行鸟',
    worlds: ['红玉海', '神意之地', '拉诺西亚', '幻影群岛', '萌芽池', '宇宙和音', '沃仙曦染', '晨曦王座'],
  },
  {
    name: '莫古力',
    worlds: ['白银乡', '白金幻象', '神拳痕', '潮风亭', '旅人栈桥', '拂晓之间', '龙巢神殿', '梦羽宝境'],
  },
  {
    name: '猫小胖',
    worlds: ['紫水栈桥', '延夏', '静语庄园', '摩杜纳', '海猫茶屋', '柔风海湾', '琥珀原'],
  },
  {
    name: '豆豆柴',
    worlds: ['水晶塔', '银泪湖', '太阳海岸', '伊修加德', '红茶川'],
  },
]

export const DC_NAMES: string[] = DATA_CENTERS.map((d) => d.name)

export const ALL_WORLDS: string[] = DATA_CENTERS.flatMap((d) => d.worlds)

const WORLD_TO_DC: ReadonlyMap<string, string> = new Map(
  DATA_CENTERS.flatMap((d) => d.worlds.map((w) => [w, d.name] as const)),
)

export function worldsOf(dc: string): string[] {
  const found = DATA_CENTERS.find((d) => d.name === dc)
  return found ? found.worlds : []
}

export function worldToDc(world: string): string | undefined {
  return WORLD_TO_DC.get(world)
}
