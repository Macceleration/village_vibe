import { useLocalStorage } from './useLocalStorage';
import { useCurrentUser } from './useCurrentUser';

export interface VillagePreferences {
  selectedVillages: string[];
  showAllVillages: boolean;
}

const defaultPreferences: VillagePreferences = {
  selectedVillages: [],
  showAllVillages: true,
};

export function useVillagePreferences() {
  const { user } = useCurrentUser();
  const storageKey = user ? `village-preferences-${user.pubkey}` : 'village-preferences-guest';
  
  const [preferences, setPreferences] = useLocalStorage<VillagePreferences>(
    storageKey,
    defaultPreferences
  );

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
    });
  };

  return {
    preferences,
    addVillage,
    removeVillage,
    toggleShowAll,
    clearAll,
    setPreferences,
  };
}