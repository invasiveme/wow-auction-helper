export interface SkillTier {
  id: number;
  name: string;
  min: number;
  max: number;
}

export interface Profession {
  id: number;
  name: string;
  descriptions: string;
  icon: string;
  type: string;
  skillTiers: SkillTier[];
}
