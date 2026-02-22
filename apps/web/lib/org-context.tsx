"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiFetch } from "@/lib/api";

const STORAGE_KEY = "freshsheet_active_restaurant";

interface OrgRestaurant {
  id: string;
  name: string;
}

interface OrgContextType {
  activeRestaurantId: string | null;
  activeRestaurantName: string | null;
  availableRestaurants: OrgRestaurant[];
  isOrgAdmin: boolean;
  switchRestaurant: (id: string) => void;
}

const OrgContext = createContext<OrgContextType>({
  activeRestaurantId: null,
  activeRestaurantName: null,
  availableRestaurants: [],
  isOrgAdmin: false,
  switchRestaurant: () => {},
});

interface UserContextResponse {
  success: boolean;
  data: {
    userId: string;
    restaurantId: string | null;
    role: string;
    organizationId: string | null;
    orgRestaurants: OrgRestaurant[];
  };
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(
    null
  );
  const [activeRestaurantName, setActiveRestaurantName] = useState<
    string | null
  >(null);
  const [availableRestaurants, setAvailableRestaurants] = useState<
    OrgRestaurant[]
  >([]);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => {
    async function fetchContext() {
      try {
        const res = await apiFetch<UserContextResponse>("/api/user/context");
        const data = res.data;

        if (data.role === "ORG_ADMIN" && data.orgRestaurants.length > 0) {
          setIsOrgAdmin(true);
          setAvailableRestaurants(data.orgRestaurants);

          // Restore from localStorage or default to first restaurant
          const stored =
            typeof window !== "undefined"
              ? localStorage.getItem(STORAGE_KEY)
              : null;
          const validStored =
            stored &&
            data.orgRestaurants.some((r: OrgRestaurant) => r.id === stored);

          const activeId = validStored
            ? stored
            : data.restaurantId || data.orgRestaurants[0].id;
          const activeRest = data.orgRestaurants.find(
            (r: OrgRestaurant) => r.id === activeId
          );

          setActiveRestaurantId(activeId);
          setActiveRestaurantName(activeRest?.name || null);

          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, activeId!);
          }
        }
      } catch {
        // Silently fail - non-org users won't have org data
      }
    }

    fetchContext();
  }, []);

  const switchRestaurant = useCallback(
    (id: string) => {
      const rest = availableRestaurants.find((r) => r.id === id);
      if (!rest) return;

      setActiveRestaurantId(id);
      setActiveRestaurantName(rest.name);

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, id);
      }
    },
    [availableRestaurants]
  );

  return (
    <OrgContext.Provider
      value={{
        activeRestaurantId,
        activeRestaurantName,
        availableRestaurants,
        isOrgAdmin,
        switchRestaurant,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
