import type { FarmerUiMode } from '@/types/farmer-ui-mode';

const NEW_FARMER_EXPERIENCE = new Set(['under_1', '1_3', 'beginner']);
const VETERAN_FARMER_EXPERIENCE = new Set(['3_5', '5_10', 'over_10', 'intermediate', 'expert']);

export function inferFarmerUiMode(experienceLevel?: string | null): FarmerUiMode {
    if (!experienceLevel) return 'new_farmer';
    if (NEW_FARMER_EXPERIENCE.has(experienceLevel)) return 'new_farmer';
    if (VETERAN_FARMER_EXPERIENCE.has(experienceLevel)) return 'veteran_farmer';
    return 'new_farmer';
}

export function resolveFarmerUiMode(uiMode?: string | null, experienceLevel?: string | null): FarmerUiMode {
    if (uiMode === 'new_farmer' || uiMode === 'veteran_farmer') {
        return uiMode;
    }

    return inferFarmerUiMode(experienceLevel);
}

