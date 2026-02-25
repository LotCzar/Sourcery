"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface TeamMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: string;
  isPending: boolean;
  createdAt: string;
}

interface TeamMembersResponse {
  success: boolean;
  data: TeamMember[];
}

interface AddStaffMemberData {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: "MANAGER" | "STAFF";
}

interface UpdateStaffMemberData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: "MANAGER" | "STAFF";
}

export function useTeamMembers() {
  return useQuery({
    queryKey: queryKeys.team.all,
    queryFn: () => apiFetch<TeamMembersResponse>("/api/team"),
  });
}

export function useAddStaffMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddStaffMemberData) =>
      apiFetch("/api/team", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
    },
  });
}

export function useUpdateStaffMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffMemberData }) =>
      apiFetch(`/api/team/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
    },
  });
}

export function useRemoveStaffMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/team/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
    },
  });
}
