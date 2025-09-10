import { useLocalStorage } from './useLocalStorage';
import { useCurrentUser } from './useCurrentUser';

export interface VillagePreferences {
  selectedVillages: string[];
  showAllVillages: boolean;
  hiddenTribes: string[]; // Tribe tags to hide from village feed
}

const defaultPreferences: VillagePreferences = {
  selectedVillages: [],
  showAllVillages: true,
  hiddenTribes: [],
};

export function useVillagePreferences() {
  const { user } = useCurrentUser();
  const storageKey = user ? `village-preferences-${user.pubkey}` : 'village-preferences-guest';

  const [rawPreferences, setRawPreferences] = useLocalStorage<VillagePreferences>(
    storageKey,
    defaultPreferences
  );

  // Migrate old preferences that don't have hiddenTribes
  const preferences: VillagePreferences = {
    ...defaultPreferences,
    ...rawPreferences,
    hiddenTribes: rawPreferences.hiddenTribes || [],
  };

  const setPreferences = (newPreferences: VillagePreferences | ((prev: VillagePreferences) => VillagePreferences)) => {
    if (typeof newPreferences === 'function') {
      setRawPreferences(prev => {
        const migrated = { ...defaultPreferences, ...prev, hiddenTribes: prev.hiddenTribes || [] };
        return newPreferences(migrated);
      });
    } else {
      setRawPreferences(newPreferences);
    }
  };

  const addVillage = (village: string) => {
    const villageSlug = village.toLowerCase().replace(/\s+/g, '-');
    if (!preferences.selectedVillages.includes(villageSlug)) {
      setPreferences({
        ...preferences,
        selectedVillages: [...preferences.selectedVillages, villageSlug],
        showAllVillages: false, // When user selects specific villages, turn off "show all"
      });
    }
  };

  const removeVillage = (village: string) => {
    setPreferences({
      ...preferences,
      selectedVillages: preferences.selectedVillages.filter(v => v !== village),
    });
  };

  const toggleShowAll = () => {
    setPreferences({
      ...preferences,
      showAllVillages: !preferences.showAllVillages,
    });
  };

  const clearAll = () => {
    setPreferences({
      selectedVillages: [],
      showAllVillages: true,
      hiddenTribes: [],
    });
  };

  const hideTribe = (tribeTag: string) => {
    if (!preferences.hiddenTribes.includes(tribeTag)) {
      setPreferences({
        ...preferences,
        hiddenTribes: [...preferences.hiddenTribes, tribeTag],
      });
    }
  };

  const showTribe = (tribeTag: string) => {
    setPreferences({
      ...preferences,
      hiddenTribes: preferences.hiddenTribes.filter(t => t !== tribeTag),
    });
  };

  const isTribeHidden = (tribeTag: string): boolean => {
    return preferences.hiddenTribes.includes(tribeTag);
  };

  return {
    preferences,
    addVillage,
    removeVillage,
    toggleShowAll,
    clearAll,
    setPreferences,
    hideTribe,
    showTribe,
    isTribeHidden,
  };
}