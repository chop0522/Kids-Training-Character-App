import { CHARACTER_SKINS, getSkinById, resolveAssetKey } from './characterSkinsConfig';
import type { BuddyProgress } from './types';

export type EvolutionStage = {
  formId: string;
  assetKey: string;
  displayName: string;
  stageIndex: number;
};

export type EvolutionLine = {
  key: string;
  evolveAtLevel: number;
  stages: EvolutionStage[];
};

export type BuddyForm = EvolutionStage & {
  buddyKey: string;
};

// Future PNG swap:
// 1) Add new PNGs under assets/skins/full with evo2 file names.
// 2) Run: npm run gen:skin-assets && npx expo start -c
// 3) Update the evo2 stage assetKey to the new evo2 filename.
export const EVOLUTION_LINES: EvolutionLine[] = [
  {
    key: 'boneca_sd_pixel_v2',
    evolveAtLevel: 10,
    stages: [
      {
        formId: 'boneca_sd_pixel_v2',
        assetKey: 'boneca_sd_pixel_v2',
        displayName: 'ボネカ',
        stageIndex: 0,
      },
      {
        formId: 'boneca_sd_pixel_v2_evo2',
        assetKey: 'boneca_sd_pixel_v2',
        displayName: 'ボネカ（進化）',
        stageIndex: 1,
      },
    ],
  },
  {
    key: 'luliloli_sd_pixel',
    evolveAtLevel: 10,
    stages: [
      {
        formId: 'luliloli_sd_pixel',
        assetKey: 'luliloli_sd_pixel',
        displayName: 'ルリロリ',
        stageIndex: 0,
      },
      {
        formId: 'luliloli_sd_pixel_evo2',
        assetKey: 'luliloli_sd_pixel',
        displayName: 'ルリロリ（進化）',
        stageIndex: 1,
      },
    ],
  },
];

export function findEvolutionLineByFormId(formId: string): EvolutionLine | undefined {
  return EVOLUTION_LINES.find((line) => line.stages.some((stage) => stage.formId === formId));
}

export function getStageByFormId(formId: string): EvolutionStage | null {
  const line = findEvolutionLineByFormId(formId);
  if (!line) return null;
  return line.stages.find((stage) => stage.formId === formId) ?? null;
}

export function getStageIndexByFormId(formId: string): number | null {
  const stage = getStageByFormId(formId);
  if (stage) return stage.stageIndex;
  const skin = getSkinById(formId);
  return skin?.evolutionStageIndex ?? null;
}

export function getNextStage(formId: string): EvolutionStage | null {
  const line = findEvolutionLineByFormId(formId);
  if (!line) return null;
  const current = getStageByFormId(formId);
  if (!current) return null;
  return line.stages[current.stageIndex + 1] ?? null;
}

export function getBuddyForm(formId: string, stageIndex?: number): BuddyForm {
  const line = findEvolutionLineByFormId(formId);
  if (line) {
    const resolvedIndex = resolveStageIndex(formId, stageIndex);
    const stage = line.stages[Math.min(Math.max(resolvedIndex, 0), line.stages.length - 1)];
    return {
      ...stage,
      buddyKey: formId,
    };
  }

  const skin = getSkinById(formId);
  const resolvedAssetKey = skin?.assetKey ?? resolveAssetKey(formId);
  return {
    buddyKey: formId,
    stageIndex: skin?.evolutionStageIndex ?? 0,
    formId,
    assetKey: resolvedAssetKey,
    displayName: skin?.name ?? formId,
  };
}

export function getAllBuddyForms(): BuddyForm[] {
  const forms: BuddyForm[] = [];
  EVOLUTION_LINES.forEach((line) => {
    line.stages.forEach((stage) => {
      forms.push({ ...stage, buddyKey: stage.formId });
    });
  });

  CHARACTER_SKINS.forEach((skin) => {
    if (forms.some((form) => form.formId === skin.id)) return;
    forms.push({
      buddyKey: skin.id,
      stageIndex: skin.evolutionStageIndex ?? 0,
      formId: skin.id,
      assetKey: skin.assetKey,
      displayName: skin.name,
    });
  });

  return forms;
}

export function canEvolveBuddy(formId: string, progress: BuddyProgress): boolean {
  const line = findEvolutionLineByFormId(formId);
  if (!line) return false;
  const stageIndex = resolveStageIndex(formId, progress.stageIndex);
  if (stageIndex >= line.stages.length - 1) return false;
  return progress.level >= line.evolveAtLevel;
}

export function getNextEvolutionStage(formId: string, progress: BuddyProgress): BuddyForm | null {
  const line = findEvolutionLineByFormId(formId);
  if (!line) return null;
  const stageIndex = resolveStageIndex(formId, progress.stageIndex);
  const next = line.stages[stageIndex + 1];
  if (!next) return null;
  return {
    ...next,
    buddyKey: next.formId,
  };
}

export function getEvolutionRequirementLevel(formId: string, progress: BuddyProgress): number | null {
  const line = findEvolutionLineByFormId(formId);
  if (!line) return null;
  const stageIndex = resolveStageIndex(formId, progress.stageIndex);
  if (stageIndex >= line.stages.length - 1) return null;
  return line.evolveAtLevel;
}

function resolveStageIndex(formId: string, progressStageIndex?: number): number {
  const stageIndexFromForm = getStageByFormId(formId)?.stageIndex;
  if (stageIndexFromForm === null || stageIndexFromForm === undefined) {
    return progressStageIndex ?? 0;
  }
  if (progressStageIndex !== undefined && progressStageIndex > stageIndexFromForm) {
    return progressStageIndex;
  }
  return stageIndexFromForm;
}
